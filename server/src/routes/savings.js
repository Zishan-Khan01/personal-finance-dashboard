import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

import {
  isPositiveMoney,
  isValidCurrencyCode,
  isValidDate,
  isValidUUID
} from "../lib/validation.js";

const router = Router();

const MAX_TRANSACTION_RETRIES = 3;

function isTransactionConflict(error) {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runSerializableTransaction(operation) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_TRANSACTION_RETRIES;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        operation,
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable
        }
      );
    } catch (error) {
      if (
        isTransactionConflict(error) &&
        attempt < MAX_TRANSACTION_RETRIES
      ) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// CREATE SAVINGS GOAL
router.post("/", async (req, res) => {
  const {
    name,
    targetAmount,
    currencyCode,
    targetDate
  } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    targetAmount === undefined ||
    targetAmount === null ||
    !currencyCode
  ) {
    return res.status(400).json({
      error:
        "name, targetAmount, and currencyCode are required"
    });
  }

  if (!isPositiveMoney(targetAmount)) {
    return res.status(400).json({
      error:
        "targetAmount must be a valid positive number with up to 4 decimal places"
    });
  }

  if (!isValidCurrencyCode(currencyCode)) {
    return res.status(400).json({
      error:
        "currencyCode must be a 3-letter uppercase currency code"
    });
  }

  let target = null;

  if (
    targetDate !== undefined &&
    targetDate !== null
  ) {
    if (!isValidDate(targetDate)) {
      return res.status(400).json({
        error:
          "targetDate must be a valid date"
      });
    }

    target = new Date(targetDate);
  }

  const currency =
    await prisma.currency.findUnique({
      where: {
        code: currencyCode
      }
    });

  if (!currency) {
    return res.status(400).json({
      error: "Invalid currency"
    });
  }

  const goal =
    await prisma.savingsGoal.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        targetAmount:
          String(targetAmount),
        currencyCode,
        targetDate: target
      },

      include: {
        currency: true
      }
    });

  res.status(201).json(goal);
});

// GET ALL SAVINGS GOALS
router.get("/", async (req, res) => {
  const goals =
    await prisma.savingsGoal.findMany({
      where: {
        userId: req.userId
      },

      include: {
        currency: true,

        contributions: {
          select: {
            id: true,
            transactionId: true,
            amount: true,
            createdAt: true
          }
        }
      },

      orderBy: {
        createdAt: "desc"
      }
    });

  const goalsWithProgress =
    goals.map((goal) => {
      const totalSaved =
        goal.contributions.reduce(
          (total, contribution) => {
            return (
              total +
              Number(contribution.amount)
            );
          },
          0
        );

      const targetAmount =
        Number(goal.targetAmount);

      const remaining =
        Math.max(
          targetAmount - totalSaved,
          0
        );

      const percentage =
        targetAmount > 0
          ? (totalSaved /
              targetAmount) *
            100
          : 0;

      return {
        ...goal,
        totalSaved,
        remaining,
        percentage: Number(
          Math.min(
            percentage,
            100
          ).toFixed(2)
        ),
        achieved:
          totalSaved >= targetAmount
      };
    });

  res.json(goalsWithProgress);
});

// ADD CONTRIBUTION TO SAVINGS GOAL
router.post(
  "/:id/contributions",
  async (req, res) => {
    const { id } = req.params;

    const {
      transactionId,
      amount
    } = req.body ?? {};

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error:
          "Invalid savings goal ID"
      });
    }

    if (
      !transactionId ||
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        error:
          "transactionId and amount are required"
      });
    }

    if (!isValidUUID(transactionId)) {
      return res.status(400).json({
        error:
          "transactionId must be a valid UUID"
      });
    }

    if (!isPositiveMoney(amount)) {
      return res.status(400).json({
        error:
          "amount must be a valid positive number with up to 4 decimal places"
      });
    }

    const contribution =
      await runSerializableTransaction(
        async (tx) => {
          const goal =
            await tx.savingsGoal.findFirst({
              where: {
                id,
                userId: req.userId
              }
            });

          if (!goal) {
            const error =
              new Error(
                "Savings goal not found"
              );

            error.statusCode = 404;

            throw error;
          }

          const transaction =
            await tx.transaction.findFirst({
              where: {
                id: transactionId,
                userId: req.userId
              }
            });

          if (!transaction) {
            const error =
              new Error(
                "Transaction not found"
              );

            error.statusCode = 404;

            throw error;
          }

          if (
            transaction.type !==
            "INCOME"
          ) {
            const error =
              new Error(
                "Only income transactions can contribute to savings goals"
              );

            error.statusCode = 400;

            throw error;
          }

          if (
            transaction.currencyCode !==
            goal.currencyCode
          ) {
            const error =
              new Error(
                "Transaction currency must match savings goal currency"
              );

            error.statusCode = 400;

            throw error;
          }

          const transactionContributionTotals =
            await tx.savingsGoalContribution.aggregate(
              {
                where: {
                  transactionId:
                    transaction.id
                },

                _sum: {
                  amount: true
                }
              }
            );

          const alreadyAllocated =
            Number(
              transactionContributionTotals
                ._sum.amount ?? 0
            );

          const transactionAmount =
            Number(
              transaction.amount
            );

          const availableAmount =
            transactionAmount -
            alreadyAllocated;

          if (
            Number(amount) >
            availableAmount
          ) {
            const error =
              new Error(
                `Contribution amount cannot exceed the remaining available income of ${availableAmount.toFixed(2)} ${transaction.currencyCode}`
              );

            error.statusCode = 400;

            throw error;
          }

          const goalContributionTotals =
            await tx.savingsGoalContribution.aggregate(
              {
                where: {
                  savingsGoalId:
                    goal.id
                },

                _sum: {
                  amount: true
                }
              }
            );

          const currentGoalSaved =
            Number(
              goalContributionTotals
                ._sum.amount ?? 0
            );

          const goalRemaining =
            Math.max(
              Number(
                goal.targetAmount
              ) -
                currentGoalSaved,
              0
            );

          if (goalRemaining <= 0) {
            const error =
              new Error(
                "This savings goal has already been achieved"
              );

            error.statusCode = 400;

            throw error;
          }

          if (
            Number(amount) >
            goalRemaining
          ) {
            const error =
              new Error(
                `Contribution amount cannot exceed the remaining goal amount of ${goalRemaining.toFixed(2)} ${goal.currencyCode}`
              );

            error.statusCode = 400;

            throw error;
          }

          return tx.savingsGoalContribution.create(
            {
              data: {
                savingsGoalId:
                  goal.id,
                transactionId:
                  transaction.id,
                amount:
                  String(amount)
              }
            }
          );
        }
      );

    res
      .status(201)
      .json(contribution);
  }
);

// UPDATE SAVINGS GOAL
router.patch("/:id", async (req, res) => {
  const { id } = req.params;

  const {
    name,
    targetAmount,
    currencyCode,
    targetDate
  } = req.body ?? {};

  if (!isValidUUID(id)) {
    return res.status(400).json({
      error:
        "Invalid savings goal ID"
    });
  }

  if (
    name === undefined &&
    targetAmount === undefined &&
    currencyCode === undefined &&
    targetDate === undefined
  ) {
    return res.status(400).json({
      error:
        "At least one field must be provided"
    });
  }

  if (
    name !== undefined &&
    (
      typeof name !== "string" ||
      !name.trim()
    )
  ) {
    return res.status(400).json({
      error: "name cannot be empty"
    });
  }

  if (
    targetAmount !== undefined &&
    !isPositiveMoney(targetAmount)
  ) {
    return res.status(400).json({
      error:
        "targetAmount must be a valid positive number with up to 4 decimal places"
    });
  }

  if (
    currencyCode !== undefined &&
    !isValidCurrencyCode(
      currencyCode
    )
  ) {
    return res.status(400).json({
      error:
        "currencyCode must be a 3-letter uppercase currency code"
    });
  }

  let parsedTargetDate;

  if (targetDate !== undefined) {
    if (targetDate === null) {
      parsedTargetDate = null;
    } else {
      if (!isValidDate(targetDate)) {
        return res.status(400).json({
          error:
            "targetDate must be a valid date"
        });
      }

      parsedTargetDate =
        new Date(targetDate);
    }
  }

  const updatedGoal =
    await runSerializableTransaction(
      async (tx) => {
        const goal =
          await tx.savingsGoal.findFirst({
            where: {
              id,
              userId: req.userId
            }
          });

        if (!goal) {
          const error =
            new Error(
              "Savings goal not found"
            );

          error.statusCode = 404;

          throw error;
        }

        const newCurrencyCode =
          currencyCode ??
          goal.currencyCode;

        if (
          currencyCode !== undefined &&
          currencyCode !==
            goal.currencyCode
        ) {
          const contributionCount =
            await tx.savingsGoalContribution.count(
              {
                where: {
                  savingsGoalId:
                    goal.id
                }
              }
            );

          if (
            contributionCount > 0
          ) {
            const error =
              new Error(
                "Currency cannot be changed after contributions have been added"
              );

            error.statusCode = 400;

            throw error;
          }
        }

        if (
          targetAmount !== undefined
        ) {
          const contributionTotals =
            await tx.savingsGoalContribution.aggregate(
              {
                where: {
                  savingsGoalId:
                    goal.id
                },

                _sum: {
                  amount: true
                }
              }
            );

          const totalSaved =
            Number(
              contributionTotals
                ._sum.amount ?? 0
            );

          if (
            Number(targetAmount) <
            totalSaved
          ) {
            const error =
              new Error(
                "Target amount cannot be less than the amount already saved"
              );

            error.statusCode = 400;

            throw error;
          }
        }

        if (
          currencyCode !== undefined
        ) {
          const currency =
            await tx.currency.findUnique({
              where: {
                code: newCurrencyCode
              }
            });

          if (!currency) {
            const error =
              new Error(
                "Invalid currency"
              );

            error.statusCode = 400;

            throw error;
          }
        }

        return tx.savingsGoal.update({
          where: {
            id: goal.id
          },

          data: {
            ...(name !== undefined && {
              name: name.trim()
            }),

            ...(targetAmount !==
              undefined && {
              targetAmount:
                String(targetAmount)
            }),

            ...(currencyCode !==
              undefined && {
              currencyCode
            }),

            ...(targetDate !==
              undefined && {
              targetDate:
                parsedTargetDate
            })
          },

          include: {
            currency: true
          }
        });
      }
    );

  res.json(updatedGoal);
});

// DELETE SAVINGS GOAL
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    return res.status(400).json({
      error:
        "Invalid savings goal ID"
    });
  }

  const goal =
    await prisma.savingsGoal.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

  if (!goal) {
    return res.status(404).json({
      error:
        "Savings goal not found"
    });
  }

  await prisma.savingsGoal.delete({
    where: {
      id: goal.id
    }
  });

  res.status(204).send();
});

export default router;
import {
  Prisma
} from "@prisma/client";

import { Router } from "express";
import { prisma } from "../lib/prisma.js";

import {
  isValidMoney,
  isPositiveMoney,
  isValidCurrencyCode,
  isValidDate,
  isValidUUID
} from "../lib/validation.js";

const router = Router();

const MAX_TRANSACTION_RETRIES = 3;

const ACCOUNT_TYPES = [
  "BANK",
  "CASH",
  "CREDIT_CARD",
  "WALLET",
  "INVESTMENT",
  "OTHER"
];

const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE"
];

function isTransactionConflict(error) {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runSerializableTransaction(
  operation
) {
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

// ==================== ACCOUNTS ====================

// GET all accounts
router.get(
  "/accounts",
  async (req, res) => {
    const accounts =
      await prisma.account.findMany({
        where: {
          userId: req.userId
        },

        orderBy: {
          createdAt: "desc"
        }
      });

    res.json(accounts);
  }
);

// CREATE account
router.post(
  "/accounts",
  async (req, res) => {
    const {
      name,
      type,
      currencyCode,
      openingBalance = "0"
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !ACCOUNT_TYPES.includes(type) ||
      !isValidCurrencyCode(
        currencyCode
      ) ||
      !isValidMoney(
        openingBalance
      )
    ) {
      return res.status(400).json({
        error:
          "name, type, currencyCode, and openingBalance are invalid"
      });
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

    const account =
      await prisma.account.create({
        data: {
          userId: req.userId,
          name: name.trim(),
          type,
          currencyCode,
          openingBalance:
            String(openingBalance),
          isActive: true
        }
      });

    res.status(201).json(account);
  }
);

// UPDATE account
router.patch(
  "/accounts/:id",
  async (req, res) => {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({
        error: "Invalid account ID"
      });
    }

    const {
      name,
      type,
      currencyCode,
      openingBalance,
      isActive
    } = req.body ?? {};

    const account =
      await prisma.account.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId
        }
      });

    if (!account) {
      return res.status(404).json({
        error: "Account not found"
      });
    }

    if (
      name === undefined &&
      type === undefined &&
      currencyCode === undefined &&
      openingBalance === undefined &&
      isActive === undefined
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
      type !== undefined &&
      !ACCOUNT_TYPES.includes(type)
    ) {
      return res.status(400).json({
        error: "Invalid account type"
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

    if (
      currencyCode !== undefined
    ) {
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
    }

    if (
      openingBalance !== undefined &&
      !isValidMoney(openingBalance)
    ) {
      return res.status(400).json({
        error:
          "openingBalance must be a valid amount"
      });
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        error:
          "isActive must be a boolean"
      });
    }

    const changingCurrency =
      currencyCode !== undefined &&
      currencyCode !==
        account.currencyCode;

    const changingOpeningBalance =
      openingBalance !== undefined &&
      String(openingBalance) !==
        account.openingBalance.toString();

    if (
      changingCurrency ||
      changingOpeningBalance
    ) {
      const [
        transactionCount,
        transferCount,
        recurringTransactionCount
      ] = await Promise.all([
        prisma.transaction.count({
          where: {
            accountId: account.id
          }
        }),

        prisma.transfer.count({
          where: {
            OR: [
              {
                fromAccountId:
                  account.id
              },
              {
                toAccountId:
                  account.id
              }
            ]
          }
        }),

        prisma.recurringTransaction.count({
          where: {
            accountId: account.id
          }
        })
      ]);

      if (
        changingCurrency &&
        (
          transactionCount > 0 ||
          transferCount > 0 ||
          recurringTransactionCount > 0
        )
      ) {
        return res.status(400).json({
          error:
            "Account currency cannot be changed after financial activity has been added"
        });
      }

      if (
        changingOpeningBalance &&
        (
          transactionCount > 0 ||
          transferCount > 0
        )
      ) {
        return res.status(400).json({
          error:
            "Opening balance cannot be changed after transactions or transfers have been added"
        });
      }
    }

    const updatedAccount =
      await prisma.account.update({
        where: {
          id: account.id
        },

        data: {
          ...(name !== undefined && {
            name: name.trim()
          }),

          ...(type !== undefined && {
            type
          }),

          ...(currencyCode !==
            undefined && {
            currencyCode
          }),

          ...(openingBalance !==
            undefined && {
            openingBalance:
              String(openingBalance)
          }),

          ...(isActive !==
            undefined && {
            isActive
          })
        }
      });

    res.json(updatedAccount);
  }
);

// DELETE account
router.delete(
  "/accounts/:id",
  async (req, res) => {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({
        error: "Invalid account ID"
      });
    }

    const account =
      await prisma.account.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId
        }
      });

    if (!account) {
      return res.status(404).json({
        error: "Account not found"
      });
    }

    const [
      transactionCount,
      transferCount,
      recurringTransactionCount
    ] = await Promise.all([
      prisma.transaction.count({
        where: {
          accountId: account.id
        }
      }),

      prisma.transfer.count({
        where: {
          OR: [
            {
              fromAccountId:
                account.id
            },
            {
              toAccountId:
                account.id
            }
          ]
        }
      }),

      prisma.recurringTransaction.count({
        where: {
          accountId: account.id
        }
      })
    ]);

    if (
      transactionCount > 0 ||
      transferCount > 0 ||
      recurringTransactionCount > 0
    ) {
      return res.status(400).json({
        error:
          "Cannot delete an account that has transactions, transfers, or recurring transactions. Deactivate it instead."
      });
    }

    await prisma.account.delete({
      where: {
        id: account.id
      }
    });

    res.status(204).send();
  }
);

// ==================== CATEGORIES ====================

// GET categories
router.get(
  "/categories",
  async (req, res) => {
    const categories =
      await prisma.category.findMany({
        where: {
          OR: [
            {
              userId: null
            },
            {
              userId: req.userId
            }
          ]
        },

        include: {
          children: true
        },

        orderBy: [
          {
            type: "asc"
          },
          {
            name: "asc"
          }
        ]
      });

    res.json(categories);
  }
);

// CREATE category
router.post(
  "/categories",
  async (req, res) => {
    const {
      name,
      type,
      parentId
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !TRANSACTION_TYPES.includes(
        type
      )
    ) {
      return res.status(400).json({
        error:
          "name and type are required"
      });
    }

    if (
      parentId !== undefined &&
      parentId !== null
    ) {
      if (!isValidUUID(parentId)) {
        return res.status(400).json({
          error:
            "parentId must be a valid UUID"
        });
      }

      const parent =
        await prisma.category.findFirst({
          where: {
            id: parentId,

            OR: [
              {
                userId: null
              },
              {
                userId: req.userId
              }
            ]
          }
        });

      if (
        !parent ||
        parent.type !== type
      ) {
        return res.status(400).json({
          error:
            "parentId must identify an accessible category of the same type"
        });
      }
    }

    const category =
      await prisma.category.create({
        data: {
          userId: req.userId,
          name: name.trim(),
          type,
          parentId:
            parentId || null
        }
      });

    res.status(201).json(category);
  }
);

// ==================== TRANSACTIONS ====================

// GET transactions
router.get(
  "/transactions",
  async (req, res) => {
    const transactions =
      await prisma.transaction.findMany({
        where: {
          userId: req.userId
        },

        include: {
          account: true,
          category: true
        },

        orderBy: {
          transactionDate: "desc"
        },

        take: 100
      });

    res.json(transactions);
  }
);

// CREATE transaction
router.post(
  "/transactions",
  async (req, res) => {
    const {
      accountId,
      categoryId,
      type,
      amount,
      description,
      transactionDate
    } = req.body ?? {};

    if (
      !accountId ||
      !categoryId ||
      !TRANSACTION_TYPES.includes(
        type
      ) ||
      !isPositiveMoney(amount) ||
      !transactionDate
    ) {
      return res.status(400).json({
        error:
          "accountId, categoryId, type, amount, and transactionDate are required"
      });
    }

    if (
      !isValidUUID(accountId) ||
      !isValidUUID(categoryId)
    ) {
      return res.status(400).json({
        error:
          "accountId and categoryId must be valid UUIDs"
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        error:
          "description must be a string"
      });
    }

    const [
      account,
      category
    ] = await Promise.all([
      prisma.account.findFirst({
        where: {
          id: accountId,
          userId: req.userId
        }
      }),

      prisma.category.findFirst({
        where: {
          id: categoryId,

          OR: [
            {
              userId: null
            },
            {
              userId: req.userId
            }
          ]
        }
      })
    ]);

    if (
      !account ||
      !category ||
      category.type !== type
    ) {
      return res.status(400).json({
        error:
          "Account or category is invalid for this transaction"
      });
    }

    if (!account.isActive) {
      return res.status(400).json({
        error:
          "Transactions cannot be created for an inactive account"
      });
    }

    if (
      !isValidDate(transactionDate)
    ) {
      return res.status(400).json({
        error:
          "transactionDate must be a valid ISO date"
      });
    }

    const date =
      new Date(transactionDate);

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: req.userId,
          accountId,
          categoryId,
          type,
          amount:
            String(amount),
          currencyCode:
            account.currencyCode,

          description:
            description?.trim() ||
            null,

          transactionDate: date
        }
      });

    res.status(201).json(transaction);
  }
);

// UPDATE transaction
router.patch(
  "/transactions/:id",
  async (req, res) => {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({
        error:
          "Invalid transaction ID"
      });
    }

    const {
      accountId,
      categoryId,
      type,
      amount,
      description,
      transactionDate
    } = req.body ?? {};

    if (
      accountId === undefined &&
      categoryId === undefined &&
      type === undefined &&
      amount === undefined &&
      description === undefined &&
      transactionDate === undefined
    ) {
      return res.status(400).json({
        error:
          "At least one field must be provided"
      });
    }

    if (
      accountId !== undefined &&
      !isValidUUID(accountId)
    ) {
      return res.status(400).json({
        error:
          "accountId must be a valid UUID"
      });
    }

    if (
      categoryId !== undefined &&
      !isValidUUID(categoryId)
    ) {
      return res.status(400).json({
        error:
          "categoryId must be a valid UUID"
      });
    }

    if (
      type !== undefined &&
      !TRANSACTION_TYPES.includes(type)
    ) {
      return res.status(400).json({
        error:
          "Invalid transaction type"
      });
    }

    if (
      amount !== undefined &&
      !isPositiveMoney(amount)
    ) {
      return res.status(400).json({
        error: "Invalid amount"
      });
    }

    if (
      transactionDate !== undefined &&
      !isValidDate(transactionDate)
    ) {
      return res.status(400).json({
        error:
          "transactionDate must be a valid ISO date"
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        error:
          "description must be a string"
      });
    }

    const result =
      await runSerializableTransaction(
        async (tx) => {
          const transaction =
            await tx.transaction.findFirst({
              where: {
                id: req.params.id,
                userId: req.userId
              }
            });

          if (!transaction) {
            return {
              status: 404,
              body: {
                error:
                  "Transaction not found"
              }
            };
          }

          const newAccountId =
            accountId ??
            transaction.accountId;

          const newCategoryId =
            categoryId ??
            transaction.categoryId;

          const newType =
            type ??
            transaction.type;

          const newAmount =
            amount !== undefined
              ? String(amount)
              : transaction.amount.toString();

          const account =
            await tx.account.findFirst({
              where: {
                id: newAccountId,
                userId: req.userId
              }
            });

          if (!account) {
            return {
              status: 400,
              body: {
                error:
                  "Invalid account"
              }
            };
          }

          if (
            accountId !== undefined &&
            !account.isActive
          ) {
            return {
              status: 400,
              body: {
                error:
                  "Transactions cannot be moved to an inactive account"
              }
            };
          }

          const category =
            await tx.category.findFirst({
              where: {
                id: newCategoryId,

                OR: [
                  {
                    userId: null
                  },
                  {
                    userId:
                      req.userId
                  }
                ]
              }
            });

          if (
            !category ||
            category.type !== newType
          ) {
            return {
              status: 400,
              body: {
                error:
                  "Invalid category for this transaction type"
              }
            };
          }

          const contributionSummary =
            await tx.savingsGoalContribution.aggregate({
              where: {
                transactionId:
                  transaction.id
              },

              _sum: {
                amount: true
              },

              _count: {
                _all: true
              }
            });

          const contributionCount =
            contributionSummary
              ._count
              ._all;

          const allocatedAmount =
            contributionSummary
              ._sum
              .amount;

          if (
            contributionCount > 0
          ) {
            if (
              newType !== "INCOME"
            ) {
              return {
                status: 400,
                body: {
                  error:
                    "A transaction with savings contributions must remain an income transaction"
                }
              };
            }

            if (
              allocatedAmount &&
              Number(newAmount) <
                Number(
                  allocatedAmount
                )
            ) {
              return {
                status: 400,
                body: {
                  error:
                    "Transaction amount cannot be reduced below the amount already allocated to savings goals"
                }
              };
            }

            if (
              account.currencyCode !==
              transaction.currencyCode
            ) {
              return {
                status: 400,
                body: {
                  error:
                    "A transaction with savings contributions cannot be moved to an account with a different currency"
                }
              };
            }
          }

          const newDate =
            transactionDate !==
            undefined
              ? new Date(
                  transactionDate
                )
              : transaction
                  .transactionDate;

          const updatedTransaction =
            await tx.transaction.update({
              where: {
                id: transaction.id
              },

              data: {
                accountId:
                  newAccountId,

                categoryId:
                  newCategoryId,

                type:
                  newType,

                amount:
                  newAmount,

                currencyCode:
                  account.currencyCode,

                ...(description !==
                  undefined && {
                  description:
                    description?.trim() ||
                    null
                }),

                transactionDate:
                  newDate
              }
            });

          return {
            status: 200,
            body:
              updatedTransaction
          };
        }
      );

    return res
      .status(result.status)
      .json(result.body);
  }
);

// DELETE transaction
router.delete(
  "/transactions/:id",
  async (req, res) => {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({
        error:
          "Invalid transaction ID"
      });
    }

    const transaction =
      await prisma.transaction.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId
        }
      });

    if (!transaction) {
      return res.status(404).json({
        error:
          "Transaction not found"
      });
    }

    await prisma.transaction.delete({
      where: {
        id: transaction.id
      }
    });

    res.status(204).send();
  }
);

export default router;
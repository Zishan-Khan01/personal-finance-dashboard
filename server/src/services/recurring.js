import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

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

function getDaysInUTCMonth(year, month) {
  return new Date(
    Date.UTC(year, month + 1, 0)
  ).getUTCDate();
}

function getNextMonthlyDate(date) {
  const originalDay =
    date.getUTCDate();

  const originalMonth =
    date.getUTCMonth();

  const originalYear =
    date.getUTCFullYear();

  let nextMonth =
    originalMonth + 1;

  let nextYear =
    originalYear;

  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  const daysInNextMonth =
    getDaysInUTCMonth(
      nextYear,
      nextMonth
    );

  const nextDay =
    Math.min(
      originalDay,
      daysInNextMonth
    );

  const next = new Date(date);

  next.setUTCFullYear(
    nextYear,
    nextMonth,
    nextDay
  );

  return next;
}

function getNextYearlyDate(date) {
  const originalYear =
    date.getUTCFullYear();

  const originalMonth =
    date.getUTCMonth();

  const originalDay =
    date.getUTCDate();

  const nextYear =
    originalYear + 1;

  const daysInTargetMonth =
    getDaysInUTCMonth(
      nextYear,
      originalMonth
    );

  const nextDay =
    Math.min(
      originalDay,
      daysInTargetMonth
    );

  const next = new Date(date);

  next.setUTCFullYear(
    nextYear,
    originalMonth,
    nextDay
  );

  return next;
}

function getNextRunDate(
  date,
  frequency
) {
  const next = new Date(date);

  switch (frequency) {
    case "DAILY":
      next.setUTCDate(
        next.getUTCDate() + 1
      );
      return next;

    case "WEEKLY":
      next.setUTCDate(
        next.getUTCDate() + 7
      );
      return next;

    case "MONTHLY":
      return getNextMonthlyDate(
        date
      );

    case "YEARLY":
      return getNextYearlyDate(
        date
      );

    default:
      throw new Error(
        `Unsupported frequency: ${frequency}`
      );
  }
}

async function processSingleRecurringTransaction(
  recurringId,
  now
) {
  return runSerializableTransaction(
    async (tx) => {
      const current =
        await tx.recurringTransaction.findUnique({
          where: {
            id: recurringId
          },

          include: {
            account: {
              select: {
                isActive: true
              }
            }
          }
        });

      if (
        !current ||
        !current.active ||
        current.nextRunDate > now
      ) {
        return null;
      }

      // Archived accounts must not generate
      // new financial activity.
      //
      // We intentionally do not advance
      // nextRunDate here. If the account is
      // restored later, processing can resume.
      if (!current.account.isActive) {
        return null;
      }

      const scheduledDate =
        current.nextRunDate;

      const existingTransaction =
        await tx.transaction.findUnique({
          where: {
            recurringTransactionId_transactionDate:
              {
                recurringTransactionId:
                  current.id,
                transactionDate:
                  scheduledDate
              }
          }
        });

      let transaction =
        existingTransaction;

      if (!existingTransaction) {
        transaction =
          await tx.transaction.create({
            data: {
              userId:
                current.userId,

              accountId:
                current.accountId,

              categoryId:
                current.categoryId,

              recurringTransactionId:
                current.id,

              type:
                current.type,

              amount:
                current.amount,

              currencyCode:
                current.currencyCode,

              description:
                current.description,

              transactionDate:
                scheduledDate
            }
          });
      }

      const nextRunDate =
        getNextRunDate(
          scheduledDate,
          current.frequency
        );

      if (
        current.endDate &&
        nextRunDate >
          current.endDate
      ) {
        await tx.recurringTransaction.update({
          where: {
            id: current.id
          },

          data: {
            active: false,
            nextRunDate
          }
        });
      } else {
        await tx.recurringTransaction.update({
          where: {
            id: current.id
          },

          data: {
            nextRunDate
          }
        });
      }

      if (existingTransaction) {
        return null;
      }

      return transaction;
    }
  );
}

export async function processRecurringTransactions() {
  const now = new Date();

  const recurringTransactions =
    await prisma.recurringTransaction.findMany({
      where: {
        active: true,

        nextRunDate: {
          lte: now
        }
      },

      select: {
        id: true
      }
    });

  const results = [];

  for (
    const recurring of
    recurringTransactions
  ) {
    try {
      const result =
        await processSingleRecurringTransaction(
          recurring.id,
          now
        );

      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(
        `Failed to process recurring transaction ${recurring.id}:`,
        error
      );
    }
  }

  return results;
}
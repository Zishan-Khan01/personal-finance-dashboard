import { Router } from "express";
import { prisma } from "../lib/prisma.js";

import {
  isPositiveMoney,
  isValidCurrencyCode,
  isValidDate,
  isValidUUID
} from "../lib/validation.js";

const router = Router();

const VALID_TYPES = ["INCOME", "EXPENSE"];
const VALID_FREQUENCIES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY"
];

// CREATE RECURRING TRANSACTION
router.post("/", async (req, res) => {
  const {
    accountId,
    categoryId,
    type,
    amount,
    currencyCode,
    description,
    frequency,
    startDate,
    endDate,
    nextRunDate
  } = req.body ?? {};

  if (
    !accountId ||
    !categoryId ||
    !type ||
    !amount ||
    !currencyCode ||
    !frequency ||
    !startDate ||
    !nextRunDate
  ) {
    return res.status(400).json({
      error:
        "accountId, categoryId, type, amount, currencyCode, frequency, startDate, and nextRunDate are required"
    });
  }

  if (!isValidUUID(accountId)) {
    return res.status(400).json({
      error: "accountId must be a valid UUID"
    });
  }

  if (!isValidUUID(categoryId)) {
    return res.status(400).json({
      error: "categoryId must be a valid UUID"
    });
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: "type must be INCOME or EXPENSE"
    });
  }

  if (!isPositiveMoney(amount)) {
    return res.status(400).json({
      error:
        "amount must be a valid positive number with up to 4 decimal places"
    });
  }

  if (!isValidCurrencyCode(currencyCode)) {
    return res.status(400).json({
      error:
        "currencyCode must be a 3-letter uppercase currency code"
    });
  }

  if (!VALID_FREQUENCIES.includes(frequency)) {
    return res.status(400).json({
      error:
        "frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY"
    });
  }

  if (
    !isValidDate(startDate) ||
    !isValidDate(nextRunDate)
  ) {
    return res.status(400).json({
      error:
        "startDate and nextRunDate must be valid dates"
    });
  }

  if (
    endDate !== undefined &&
    endDate !== null &&
    !isValidDate(endDate)
  ) {
    return res.status(400).json({
      error: "endDate must be a valid date"
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "description must be a string"
    });
  }

  const start = new Date(startDate);
  const nextRun = new Date(nextRunDate);
  const end = endDate
    ? new Date(endDate)
    : null;

  if (end && end <= start) {
    return res.status(400).json({
      error: "endDate must be after startDate"
    });
  }

  if (nextRun < start) {
    return res.status(400).json({
      error:
        "nextRunDate cannot be before startDate"
    });
  }

  if (end && nextRun > end) {
    return res.status(400).json({
      error:
        "nextRunDate cannot be after endDate"
    });
  }

  // Check account ownership
  const account =
    await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: req.userId
      }
    });

  if (!account) {
    return res.status(400).json({
      error: "Invalid account"
    });
  }

  // Check category accessibility and type
  const category =
    await prisma.category.findFirst({
      where: {
        id: categoryId,
        type,
        OR: [
          { userId: null },
          { userId: req.userId }
        ]
      }
    });

  if (!category) {
    return res.status(400).json({
      error:
        "Invalid category for transaction type"
    });
  }

  // Currency must exist
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

  // Currency must match account currency
  if (account.currencyCode !== currencyCode) {
    return res.status(400).json({
      error:
        "Recurring transaction currency must match account currency"
    });
  }

  const recurringTransaction =
    await prisma.recurringTransaction.create({
      data: {
        userId: req.userId,
        accountId,
        categoryId,
        type,
        amount: String(amount),
        currencyCode,
        description:
          description?.trim() || null,
        frequency,
        startDate: start,
        endDate: end,
        nextRunDate: nextRun,
        active: true
      },
      include: {
        account: true,
        category: true,
        currency: true
      }
    });

  res.status(201).json(
    recurringTransaction
  );
});

// GET ALL RECURRING TRANSACTIONS
router.get("/", async (req, res) => {
  const recurringTransactions =
    await prisma.recurringTransaction.findMany({
      where: {
        userId: req.userId
      },
      include: {
        account: true,
        category: true,
        currency: true
      },
      orderBy: {
        nextRunDate: "asc"
      }
    });

  res.json(recurringTransactions);
});

// UPDATE RECURRING TRANSACTION
router.patch("/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    return res.status(400).json({
      error:
        "Invalid recurring transaction ID"
    });
  }

  const {
    accountId,
    categoryId,
    type,
    amount,
    currencyCode,
    description,
    frequency,
    startDate,
    endDate,
    nextRunDate,
    active
  } = req.body ?? {};

  const recurringTransaction =
    await prisma.recurringTransaction.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

  if (!recurringTransaction) {
    return res.status(404).json({
      error:
        "Recurring transaction not found"
    });
  }

  if (
    accountId === undefined &&
    categoryId === undefined &&
    type === undefined &&
    amount === undefined &&
    currencyCode === undefined &&
    description === undefined &&
    frequency === undefined &&
    startDate === undefined &&
    endDate === undefined &&
    nextRunDate === undefined &&
    active === undefined
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
      error: "accountId must be a valid UUID"
    });
  }

  if (
    categoryId !== undefined &&
    !isValidUUID(categoryId)
  ) {
    return res.status(400).json({
      error: "categoryId must be a valid UUID"
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "description must be a string"
    });
  }

  if (
    active !== undefined &&
    typeof active !== "boolean"
  ) {
    return res.status(400).json({
      error: "active must be a boolean"
    });
  }

  const newAccountId =
    accountId ??
    recurringTransaction.accountId;

  const newCategoryId =
    categoryId ??
    recurringTransaction.categoryId;

  const newType =
    type ?? recurringTransaction.type;

  const newAmount =
    amount ??
    recurringTransaction.amount.toString();

  const newCurrencyCode =
    currencyCode ??
    recurringTransaction.currencyCode;

  const newFrequency =
    frequency ??
    recurringTransaction.frequency;

  const newStartDate =
    startDate !== undefined
      ? new Date(startDate)
      : recurringTransaction.startDate;

  const newEndDate =
    endDate !== undefined
      ? endDate === null
        ? null
        : new Date(endDate)
      : recurringTransaction.endDate;

  const newNextRunDate =
    nextRunDate !== undefined
      ? new Date(nextRunDate)
      : recurringTransaction.nextRunDate;

  if (!VALID_TYPES.includes(newType)) {
    return res.status(400).json({
      error: "type must be INCOME or EXPENSE"
    });
  }

  if (!isPositiveMoney(newAmount)) {
    return res.status(400).json({
      error:
        "amount must be a valid positive number with up to 4 decimal places"
    });
  }

  if (
    !isValidCurrencyCode(newCurrencyCode)
  ) {
    return res.status(400).json({
      error:
        "currencyCode must be a 3-letter uppercase currency code"
    });
  }

  if (
    !VALID_FREQUENCIES.includes(
      newFrequency
    )
  ) {
    return res.status(400).json({
      error:
        "frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY"
    });
  }

  if (
    (startDate !== undefined &&
      !isValidDate(startDate)) ||
    (nextRunDate !== undefined &&
      !isValidDate(nextRunDate))
  ) {
    return res.status(400).json({
      error:
        "startDate and nextRunDate must be valid dates"
    });
  }

  if (
    endDate !== undefined &&
    endDate !== null &&
    !isValidDate(endDate)
  ) {
    return res.status(400).json({
      error: "endDate must be a valid date"
    });
  }

  if (
    newEndDate &&
    newEndDate <= newStartDate
  ) {
    return res.status(400).json({
      error:
        "endDate must be after startDate"
    });
  }

  if (newNextRunDate < newStartDate) {
    return res.status(400).json({
      error:
        "nextRunDate cannot be before startDate"
    });
  }

  if (
    newEndDate &&
    newNextRunDate > newEndDate
  ) {
    return res.status(400).json({
      error:
        "nextRunDate cannot be after endDate"
    });
  }

  // Check account ownership
  const account =
    await prisma.account.findFirst({
      where: {
        id: newAccountId,
        userId: req.userId
      }
    });

  if (!account) {
    return res.status(400).json({
      error: "Invalid account"
    });
  }

  // Check category
  const category =
    await prisma.category.findFirst({
      where: {
        id: newCategoryId,
        type: newType,
        OR: [
          { userId: null },
          { userId: req.userId }
        ]
      }
    });

  if (!category) {
    return res.status(400).json({
      error:
        "Invalid category for transaction type"
    });
  }

  // Check currency
  const currency =
    await prisma.currency.findUnique({
      where: {
        code: newCurrencyCode
      }
    });

  if (!currency) {
    return res.status(400).json({
      error: "Invalid currency"
    });
  }

  // Currency must match account
  if (
    account.currencyCode !==
    newCurrencyCode
  ) {
    return res.status(400).json({
      error:
        "Recurring transaction currency must match account currency"
    });
  }

  const updatedRecurringTransaction =
    await prisma.recurringTransaction.update({
      where: {
        id: recurringTransaction.id
      },
      data: {
        ...(accountId !== undefined && {
          accountId
        }),

        ...(categoryId !== undefined && {
          categoryId
        }),

        ...(type !== undefined && {
          type
        }),

        ...(amount !== undefined && {
          amount: String(amount)
        }),

        ...(currencyCode !== undefined && {
          currencyCode
        }),

        ...(description !== undefined && {
          description:
            description?.trim() || null
        }),

        ...(frequency !== undefined && {
          frequency
        }),

        ...(startDate !== undefined && {
          startDate: newStartDate
        }),

        ...(endDate !== undefined && {
          endDate: newEndDate
        }),

        ...(nextRunDate !== undefined && {
          nextRunDate: newNextRunDate
        }),

        ...(active !== undefined && {
          active
        })
      },
      include: {
        account: true,
        category: true,
        currency: true
      }
    });

  res.json(
    updatedRecurringTransaction
  );
});

// DELETE RECURRING TRANSACTION
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    return res.status(400).json({
      error:
        "Invalid recurring transaction ID"
    });
  }

  const recurringTransaction =
    await prisma.recurringTransaction.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

  if (!recurringTransaction) {
    return res.status(404).json({
      error:
        "Recurring transaction not found"
    });
  }

  await prisma.recurringTransaction.delete({
    where: {
      id: recurringTransaction.id
    }
  });

  res.status(204).send();
});

export default router;
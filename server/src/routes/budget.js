import { Router } from "express";
import { prisma } from "../lib/prisma.js";

import {
  isPositiveMoney,
  isValidCurrencyCode,
  isValidDate,
  isValidUUID
} from "../lib/validation.js";

const router = Router();

// GET ALL BUDGETS
router.get("/", async (req, res) => {
  const budgets = await prisma.budget.findMany({
    where: {
      userId: req.userId
    },
    include: {
      category: true,
      currency: true
    },
    orderBy: {
      startDate: "desc"
    }
  });

  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: req.userId,
          categoryId: budget.categoryId,
          type: "EXPENSE",
          currencyCode: budget.currencyCode,
          transactionDate: {
            gte: budget.startDate,
            lt: budget.endDate
          }
        },
        select: {
          amount: true
        }
      });

      const spent = transactions.reduce((total, transaction) => {
        return total + Number(transaction.amount);
      }, 0);

      const budgetAmount = Number(budget.amount);

      const remaining = Math.max(
        budgetAmount - spent,
        0
      );

      const percentage =
        budgetAmount > 0
          ? (spent / budgetAmount) * 100
          : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentage: Number(percentage.toFixed(2))
      };
    })
  );

  res.json(budgetsWithSpending);
});

// DELETE BUDGET
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    return res.status(400).json({
      error: "Invalid budget ID"
    });
  }

  const budget = await prisma.budget.findFirst({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!budget) {
    return res.status(404).json({
      error: "Budget not found"
    });
  }

  await prisma.budget.delete({
    where: {
      id: budget.id
    }
  });

  res.json({
    message: "Budget deleted successfully"
  });
});

// CREATE BUDGET
router.post("/", async (req, res) => {
  const {
    categoryId,
    amount,
    currencyCode,
    startDate,
    endDate
  } = req.body ?? {};

  if (
    !categoryId ||
    !amount ||
    !currencyCode ||
    !startDate ||
    !endDate
  ) {
    return res.status(400).json({
      error:
        "categoryId, amount, currencyCode, startDate, and endDate are required"
    });
  }

  if (!isValidUUID(categoryId)) {
    return res.status(400).json({
      error: "categoryId must be a valid UUID"
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

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    return res.status(400).json({
      error: "startDate and endDate must be valid dates"
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return res.status(400).json({
      error: "endDate must be after startDate"
    });
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      type: "EXPENSE",
      OR: [
        { userId: null },
        { userId: req.userId }
      ]
    }
  });

  if (!category) {
    return res.status(400).json({
      error: "Invalid expense category"
    });
  }

  const currency = await prisma.currency.findUnique({
    where: {
      code: currencyCode
    }
  });

  if (!currency) {
    return res.status(400).json({
      error: "Invalid currency"
    });
  }

  const budget = await prisma.budget.create({
    data: {
      userId: req.userId,
      categoryId,
      amount: String(amount),
      currencyCode,
      startDate: start,
      endDate: end
    },

    include: {
      category: true,
      currency: true
    }
  });

  res.status(201).json(budget);
});

// UPDATE BUDGET
router.patch("/:id", async (req, res) => {
  const { id } = req.params;

  const {
    categoryId,
    amount,
    currencyCode,
    startDate,
    endDate
  } = req.body ?? {};

  if (!isValidUUID(id)) {
    return res.status(400).json({
      error: "Invalid budget ID"
    });
  }

  const budget = await prisma.budget.findFirst({
    where: {
      id,
      userId: req.userId
    }
  });

  if (!budget) {
    return res.status(404).json({
      error: "Budget not found"
    });
  }

  if (
    !categoryId ||
    !amount ||
    !currencyCode ||
    !startDate ||
    !endDate
  ) {
    return res.status(400).json({
      error:
        "categoryId, amount, currencyCode, startDate, and endDate are required"
    });
  }

  if (!isValidUUID(categoryId)) {
    return res.status(400).json({
      error: "categoryId must be a valid UUID"
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

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    return res.status(400).json({
      error: "startDate and endDate must be valid dates"
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return res.status(400).json({
      error: "endDate must be after startDate"
    });
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      type: "EXPENSE",
      OR: [
        { userId: null },
        { userId: req.userId }
      ]
    }
  });

  if (!category) {
    return res.status(400).json({
      error: "Invalid expense category"
    });
  }

  const currency = await prisma.currency.findUnique({
    where: {
      code: currencyCode
    }
  });

  if (!currency) {
    return res.status(400).json({
      error: "Invalid currency"
    });
  }

  const updatedBudget = await prisma.budget.update({
    where: {
      id: budget.id
    },

    data: {
      categoryId,
      amount: String(amount),
      currencyCode,
      startDate: start,
      endDate: end
    },

    include: {
      category: true,
      currency: true
    }
  });

  res.json(updatedBudget);
});

export default router;
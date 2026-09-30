import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const { month } = req.query;

  // 1. Validate month
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({
      error: "month must be in YYYY-MM format"
    });
  }

  // 2. Create date range
  const startDate = new Date(`${month}-01T00:00:00.000Z`);

  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);

  // 3. Get user's accounts
  const accounts = await prisma.account.findMany({
    where: {
      userId: req.userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // 4. Get transactions for selected month
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.userId,
      transactionDate: {
        gte: startDate,
        lt: endDate
      }
    },
    include: {
      account: true,
      category: true
    },
    orderBy: {
      transactionDate: "desc"
    }
  });

  // 5. Get transfers for selected month
  const transfers = await prisma.transfer.findMany({
    where: {
      userId: req.userId,
      transferDate: {
        gte: startDate,
        lt: endDate
      }
    },
    include: {
      fromAccount: true,
      toAccount: true
    },
    orderBy: {
      transferDate: "desc"
    }
  });

  // 6. Calculate monthly income
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((total, transaction) => {
      return total + Number(transaction.amount);
    }, 0);

  // 7. Calculate monthly expenses
  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((total, transaction) => {
      return total + Number(transaction.amount);
    }, 0);

  // 8. Calculate monthly savings
  const netSavings = totalIncome - totalExpenses;

  // 9. Calculate expenses by category
  const expensesByCategory = {};

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;

    const categoryName = transaction.category.name;

    if (!expensesByCategory[categoryName]) {
      expensesByCategory[categoryName] = 0;
    }

    expensesByCategory[categoryName] += Number(transaction.amount);
  }

  // 10. Convert category object into an array
  const categoryBreakdown = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      category,
      amount
    }))
    .sort((a, b) => b.amount - a.amount);

  // 11. Return dashboard
  res.json({
    month,

    summary: {
      totalIncome,
      totalExpenses,
      netSavings
    },

    expensesByCategory: categoryBreakdown,

    accounts,

    recentTransactions: transactions.slice(0, 10),

    recentTransfers: transfers.slice(0, 10)
  });
});

export default router;
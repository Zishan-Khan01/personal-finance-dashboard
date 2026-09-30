import {
  afterAll,
  beforeEach,
  describe,
  expect,
  test
} from "vitest";

import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const TEST_EMAIL = "vitest.dashboard@example.com";
const TEST_PASSWORD = "TestDashboard@2026";

let accessToken;
let accountId;
let secondAccountId;
let incomeCategoryId;
let expenseCategoryId;

async function setup() {
  await prisma.currency.upsert({
    where: { code: "USD" },
    update: {},
    create: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimalPlaces: 2
    }
  });

  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Vitest Dashboard User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

  accessToken = registerResponse.body.accessToken;

  const firstAccount = await request(app)
    .post("/api/accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Dashboard Bank",
      type: "BANK",
      currencyCode: "USD",
      openingBalance: "5000"
    });

  accountId = firstAccount.body.id;

  const secondAccount = await request(app)
    .post("/api/accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Dashboard Wallet",
      type: "WALLET",
      currencyCode: "USD",
      openingBalance: "1000"
    });

  secondAccountId = secondAccount.body.id;

  const incomeCategory = await request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Dashboard Income",
      type: "INCOME"
    });

  incomeCategoryId = incomeCategory.body.id;

  const expenseCategory = await request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Dashboard Expense",
      type: "EXPENSE"
    });

  expenseCategoryId = expenseCategory.body.id;
}

describe("Dashboard API", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL }
    });

    await setup();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL }
    });

    await prisma.$disconnect();
  });

  test("GET /api/dashboard rejects a missing month", async () => {
    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "month must be in YYYY-MM format"
    );
  });

  test("GET /api/dashboard rejects an invalid month", async () => {
    const response = await request(app)
      .get("/api/dashboard?month=2026-13")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  test("GET /api/dashboard returns zero summary with no transactions", async () => {
    const response = await request(app)
      .get("/api/dashboard?month=2026-09")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.summary).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0
    });

    expect(response.body.expensesByCategory).toEqual([]);
    expect(response.body.accounts).toHaveLength(2);
  });

  test("GET /api/dashboard calculates monthly totals and category spending", async () => {
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId,
        categoryId: incomeCategoryId,
        type: "INCOME",
        amount: "2000",
        description: "September income",
        transactionDate: "2026-09-10"
      })
      .expect(201);

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        amount: "500",
        description: "September expense",
        transactionDate: "2026-09-15"
      })
      .expect(201);

    // This October transaction must NOT affect September.
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        amount: "900",
        description: "October expense",
        transactionDate: "2026-10-15"
      })
      .expect(201);

    const response = await request(app)
      .get("/api/dashboard?month=2026-09")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.summary).toEqual({
      totalIncome: 2000,
      totalExpenses: 500,
      netSavings: 1500
    });

    expect(response.body.expensesByCategory).toEqual([
      {
        category: "Dashboard Expense",
        amount: 500
      }
    ]);

    expect(response.body.recentTransactions).toHaveLength(2);
  });

  test("GET /api/dashboard returns transfers from the selected month", async () => {
    await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fromAccountId: accountId,
        toAccountId: secondAccountId,
        amount: "300",
        description: "Dashboard transfer",
        transferDate: "2026-09-20"
      })
      .expect(201);

    const response = await request(app)
      .get("/api/dashboard?month=2026-09")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.recentTransfers).toHaveLength(1);

    expect(
      response.body.recentTransfers[0].description
    ).toBe("Dashboard transfer");
  });
});
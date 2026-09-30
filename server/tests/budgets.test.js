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

const TEST_EMAIL = "vitest.budgets@example.com";
const TEST_PASSWORD = "TestBudgets@2026";

let accessToken;
let expenseCategoryId;
let accountId;

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
      name: "Vitest Budgets User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

  accessToken = registerResponse.body.accessToken;

  const categoryResponse = await request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Budget Expense",
      type: "EXPENSE"
    });

  expenseCategoryId = categoryResponse.body.id;

  const accountResponse = await request(app)
    .post("/api/accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Budget Bank",
      type: "BANK",
      currencyCode: "USD",
      openingBalance: "5000"
    });

  accountId = accountResponse.body.id;
}

describe("Budgets API", () => {
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

  test("POST /api/budgets creates a budget", async () => {
    const response = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        amount: "1000",
        currencyCode: "USD",
        startDate: "2026-09-01",
        endDate: "2026-10-01"
      });

    expect(response.status).toBe(201);
    expect(Number(response.body.amount)).toBe(1000);
    expect(response.body.currencyCode).toBe("USD");
  });

  test("POST /api/budgets rejects endDate before startDate", async () => {
    const response = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        amount: "1000",
        currencyCode: "USD",
        startDate: "2026-10-01",
        endDate: "2026-09-01"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "endDate must be after startDate"
    );
  });

  test("GET /api/budgets calculates spending and remaining amount", async () => {
    await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        amount: "1000",
        currencyCode: "USD",
        startDate: "2026-09-01",
        endDate: "2026-10-01"
      })
      .expect(201);

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        amount: "250",
        transactionDate: "2026-09-15"
      })
      .expect(201);

    const response = await request(app)
      .get("/api/budgets")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);

    expect(response.body[0].spent).toBe(250);
    expect(response.body[0].remaining).toBe(750);
    expect(response.body[0].percentage).toBe(25);
  });

  test("PATCH /api/budgets/:id updates a budget", async () => {
    const createResponse = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        amount: "1000",
        currencyCode: "USD",
        startDate: "2026-09-01",
        endDate: "2026-10-01"
      });

    const response = await request(app)
      .patch(`/api/budgets/${createResponse.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        amount: "1500",
        currencyCode: "USD",
        startDate: "2026-09-01",
        endDate: "2026-11-01"
      });

    expect(response.status).toBe(200);
    expect(Number(response.body.amount)).toBe(1500);
  });

  test("DELETE /api/budgets/:id deletes a budget", async () => {
    const createResponse = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        amount: "1000",
        currencyCode: "USD",
        startDate: "2026-09-01",
        endDate: "2026-10-01"
      });

    const response = await request(app)
      .delete(`/api/budgets/${createResponse.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Budget deleted successfully"
    });
  });
});
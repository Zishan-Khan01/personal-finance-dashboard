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

const TEST_EMAIL = "vitest.savings@example.com";
const TEST_PASSWORD = "TestSavings@2026";

let accessToken;
let accountId;
let incomeCategoryId;
let expenseCategoryId;
let incomeTransactionId;
let expenseTransactionId;

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
      name: "Vitest Savings User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

  expect(registerResponse.status).toBe(201);

  accessToken =
    registerResponse.body.accessToken;

  const accountResponse = await request(app)
    .post("/api/accounts")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: "Savings Bank",
      type: "BANK",
      currencyCode: "USD",
      openingBalance: "5000"
    });

  expect(accountResponse.status).toBe(201);

  accountId = accountResponse.body.id;

  const incomeCategory = await request(app)
    .post("/api/categories")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: "Savings Income",
      type: "INCOME"
    });

  expect(incomeCategory.status).toBe(201);

  incomeCategoryId =
    incomeCategory.body.id;

  const expenseCategory = await request(app)
    .post("/api/categories")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: "Savings Expense",
      type: "EXPENSE"
    });

  expect(expenseCategory.status).toBe(201);

  expenseCategoryId =
    expenseCategory.body.id;

  const incomeTransaction =
    await request(app)
      .post("/api/transactions")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        accountId,
        categoryId:
          incomeCategoryId,
        type: "INCOME",
        amount: "3000",
        description:
          "Savings test income",
        transactionDate:
          "2026-09-29"
      });

  expect(
    incomeTransaction.status
  ).toBe(201);

  incomeTransactionId =
    incomeTransaction.body.id;

  const expenseTransaction =
    await request(app)
      .post("/api/transactions")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        accountId,
        categoryId:
          expenseCategoryId,
        type: "EXPENSE",
        amount: "100",
        description:
          "Savings test expense",
        transactionDate:
          "2026-09-29"
      });

  expect(
    expenseTransaction.status
  ).toBe(201);

  expenseTransactionId =
    expenseTransaction.body.id;
}

async function createGoal(
  targetAmount = "1500"
) {
  return request(app)
    .post("/api/savings-goals")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: "Laptop Goal",
      targetAmount,
      currencyCode: "USD",
      targetDate: "2027-01-01"
    });
}

async function createIncomeTransaction(
  amount
) {
  const response = await request(app)
    .post("/api/transactions")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      accountId,
      categoryId: incomeCategoryId,
      type: "INCOME",
      amount,
      description:
        "Concurrency test income",
      transactionDate: "2026-09-30"
    });

  expect(response.status).toBe(201);

  return response.body;
}

describe("Savings Goals API", () => {
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

  test("POST /api/savings-goals creates a savings goal", async () => {
    const response = await createGoal();

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      name: "Laptop Goal",
      currencyCode: "USD"
    });

    expect(
      Number(response.body.targetAmount)
    ).toBe(1500);
  });

  test("GET /api/savings-goals initially reports zero progress", async () => {
    await createGoal();

    const response = await request(app)
      .get("/api/savings-goals")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(response.status).toBe(200);

    expect(
      response.body[0].totalSaved
    ).toBe(0);

    expect(
      response.body[0].percentage
    ).toBe(0);

    expect(
      response.body[0].achieved
    ).toBe(false);
  });

  test("income can partially contribute multiple times to the same goal", async () => {
    const goalResponse =
      await createGoal("1500");

    const goalId =
      goalResponse.body.id;

    await request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "500"
      })
      .expect(201);

    await request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "500"
      })
      .expect(201);

    const response = await request(app)
      .get("/api/savings-goals")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(
      response.body[0].totalSaved
    ).toBe(1000);

    expect(
      response.body[0].remaining
    ).toBe(500);

    expect(
      response.body[0].achieved
    ).toBe(false);
  });

  test("expense transactions cannot contribute to savings goals", async () => {
    const goalResponse =
      await createGoal();

    const response = await request(app)
      .post(
        `/api/savings-goals/${goalResponse.body.id}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          expenseTransactionId,
        amount: "100"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Only income transactions can contribute to savings goals"
    );
  });

  test("contributions cannot exceed the remaining goal amount", async () => {
    const goalResponse =
      await createGoal("1000");

    const response = await request(app)
      .post(
        `/api/savings-goals/${goalResponse.body.id}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "1500"
      });

    expect(response.status).toBe(400);
  });

  test("contributions cannot exceed the available income", async () => {
    const goalResponse =
      await createGoal("5000");

    const response = await request(app)
      .post(
        `/api/savings-goals/${goalResponse.body.id}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "3500"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toContain(
      "remaining available income"
    );
  });

  test("goal becomes achieved at 100 percent", async () => {
    const goalResponse =
      await createGoal("1500");

    const goalId =
      goalResponse.body.id;

    await request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "1500"
      })
      .expect(201);

    const response = await request(app)
      .get("/api/savings-goals")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(
      response.body[0].totalSaved
    ).toBe(1500);

    expect(
      response.body[0].remaining
    ).toBe(0);

    expect(
      response.body[0].percentage
    ).toBe(100);

    expect(
      response.body[0].achieved
    ).toBe(true);
  });

  test("PATCH /api/savings-goals/:id rejects target below already saved amount", async () => {
    const goalResponse =
      await createGoal("2000");

    const goalId =
      goalResponse.body.id;

    await request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "1000"
      })
      .expect(201);

    const response = await request(app)
      .patch(
        `/api/savings-goals/${goalId}`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        targetAmount: "500"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Target amount cannot be less than the amount already saved"
    );
  });

  test("DELETE /api/savings-goals/:id deletes the goal", async () => {
    const goalResponse =
      await createGoal();

    const response = await request(app)
      .delete(
        `/api/savings-goals/${goalResponse.body.id}`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(response.status).toBe(204);
  });

  test("concurrent contributions cannot over-allocate the same income transaction", async () => {
    const income =
      await createIncomeTransaction(
        "1000"
      );

    const firstGoal =
      await createGoal("2000");

    const secondGoal =
      await createGoal("2000");

    const firstRequest = request(app)
      .post(
        `/api/savings-goals/${firstGoal.body.id}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId: income.id,
        amount: "700"
      });

    const secondRequest = request(app)
      .post(
        `/api/savings-goals/${secondGoal.body.id}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId: income.id,
        amount: "700"
      });

    const [firstResponse, secondResponse] =
      await Promise.all([
        firstRequest,
        secondRequest
      ]);

    const statuses = [
      firstResponse.status,
      secondResponse.status
    ].sort();

    expect(statuses).toEqual([
      201,
      400
    ]);

    const totals =
      await prisma.savingsGoalContribution.aggregate(
        {
          where: {
            transactionId: income.id
          },
          _sum: {
            amount: true
          }
        }
      );

    expect(
      Number(totals._sum.amount ?? 0)
    ).toBe(700);

    expect(
      Number(totals._sum.amount ?? 0)
    ).toBeLessThanOrEqual(1000);
  });

  test("concurrent contributions cannot exceed the savings goal target", async () => {
    const firstIncome =
      await createIncomeTransaction(
        "1000"
      );

    const secondIncome =
      await createIncomeTransaction(
        "1000"
      );

    const goalResponse =
      await createGoal("1000");

    const goalId =
      goalResponse.body.id;

    const firstRequest = request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          firstIncome.id,
        amount: "700"
      });

    const secondRequest = request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          secondIncome.id,
        amount: "700"
      });

    const [firstResponse, secondResponse] =
      await Promise.all([
        firstRequest,
        secondRequest
      ]);

    const statuses = [
      firstResponse.status,
      secondResponse.status
    ].sort();

    expect(statuses).toEqual([
      201,
      400
    ]);

    const totals =
      await prisma.savingsGoalContribution.aggregate(
        {
          where: {
            savingsGoalId: goalId
          },
          _sum: {
            amount: true
          }
        }
      );

    expect(
      Number(totals._sum.amount ?? 0)
    ).toBe(700);

    expect(
      Number(totals._sum.amount ?? 0)
    ).toBeLessThanOrEqual(1000);
  });

  test("concurrent target update and contribution cannot leave saved amount above target", async () => {
    const goalResponse =
      await createGoal("1000");

    const goalId =
      goalResponse.body.id;

    await request(app)
      .post(
        `/api/savings-goals/${goalId}/contributions`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        transactionId:
          incomeTransactionId,
        amount: "600"
      })
      .expect(201);

    const updateRequest = request(app)
      .patch(
        `/api/savings-goals/${goalId}`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        targetAmount: "700"
      });

    const contributionRequest =
      request(app)
        .post(
          `/api/savings-goals/${goalId}/contributions`
        )
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          transactionId:
            incomeTransactionId,
          amount: "300"
        });

    const [
      updateResponse,
      contributionResponse
    ] = await Promise.all([
      updateRequest,
      contributionRequest
    ]);

    expect([
      200,
      400
    ]).toContain(
      updateResponse.status
    );

    expect([
      201,
      400
    ]).toContain(
      contributionResponse.status
    );

    expect(
      updateResponse.status === 400 ||
        contributionResponse.status === 400
    ).toBe(true);

    const storedGoal =
      await prisma.savingsGoal.findUnique({
        where: {
          id: goalId
        }
      });

    const totals =
      await prisma.savingsGoalContribution.aggregate(
        {
          where: {
            savingsGoalId: goalId
          },
          _sum: {
            amount: true
          }
        }
      );

    const saved =
      Number(
        totals._sum.amount ?? 0
      );

    const target =
      Number(
        storedGoal.targetAmount
      );

    expect(saved).toBeLessThanOrEqual(
      target
    );
  });
});
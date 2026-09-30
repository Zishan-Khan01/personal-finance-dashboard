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

const TEST_EMAIL =
  "vitest.transactions@example.com";

const TEST_PASSWORD =
  "TestTransactions@2026";

let accessToken;
let userId;
let accountId;
let incomeCategoryId;
let expenseCategoryId;

async function setup() {
  await prisma.currency.upsert({
    where: {
      code: "USD"
    },
    update: {},
    create: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimalPlaces: 2
    }
  });

  await prisma.currency.upsert({
    where: {
      code: "EUR"
    },
    update: {},
    create: {
      code: "EUR",
      name: "Euro",
      symbol: "€",
      decimalPlaces: 2
    }
  });

  const registerResponse =
    await request(app)
      .post("/api/auth/register")
      .send({
        name:
          "Vitest Transactions User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

  expect(
    registerResponse.status
  ).toBe(201);

  accessToken =
    registerResponse.body.accessToken;

  userId =
    registerResponse.body.user.id;

  const accountResponse =
    await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name:
          "Transaction Test Bank",
        type: "BANK",
        currencyCode: "USD",
        openingBalance: "1000"
      });

  expect(
    accountResponse.status
  ).toBe(201);

  accountId =
    accountResponse.body.id;

  const incomeResponse =
    await request(app)
      .post("/api/categories")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Test Income",
        type: "INCOME"
      });

  expect(
    incomeResponse.status
  ).toBe(201);

  incomeCategoryId =
    incomeResponse.body.id;

  const expenseResponse =
    await request(app)
      .post("/api/categories")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Test Expense",
        type: "EXPENSE"
      });

  expect(
    expenseResponse.status
  ).toBe(201);

  expenseCategoryId =
    expenseResponse.body.id;
}

async function createIncomeTransaction(
  amount = "1000"
) {
  const response =
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
        amount,
        description:
          "Savings-backed income",
        transactionDate:
          "2026-09-29"
      });

  expect(response.status).toBe(201);

  return response.body;
}

async function createSavingsGoal(
  targetAmount = "2000"
) {
  return prisma.savingsGoal.create({
    data: {
      userId,
      name:
        "Transaction Integrity Goal",
      targetAmount,
      currencyCode: "USD"
    }
  });
}

async function createContribution({
  savingsGoalId,
  transactionId,
  amount
}) {
  return prisma.savingsGoalContribution.create({
    data: {
      savingsGoalId,
      transactionId,
      amount
    }
  });
}

describe("Transactions API", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await setup();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await prisma.$disconnect();
  });

  test(
    "GET /api/transactions initially returns an empty array",
    async () => {
      const response =
        await request(app)
          .get("/api/transactions")
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body
      ).toEqual([]);
    }
  );

  test(
    "POST /api/transactions creates an income transaction",
    async () => {
      const response =
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
            amount: "2000",
            description:
              "Automated income",
            transactionDate:
              "2026-09-29"
          });

      expect(
        response.status
      ).toBe(201);

      expect(
        response.body
      ).toMatchObject({
        accountId,
        categoryId:
          incomeCategoryId,
        type: "INCOME",
        currencyCode: "USD",
        description:
          "Automated income"
      });

      expect(
        Number(
          response.body.amount
        )
      ).toBe(2000);
    }
  );

  test(
    "POST /api/transactions creates an expense transaction",
    async () => {
      const response =
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
              "Automated expense",
            transactionDate:
              "2026-09-29"
          });

      expect(
        response.status
      ).toBe(201);

      expect(
        response.body.type
      ).toBe("EXPENSE");

      expect(
        Number(
          response.body.amount
        )
      ).toBe(100);
    }
  );

  test(
    "POST /api/transactions rejects a zero amount",
    async () => {
      const response =
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
            amount: "0",
            transactionDate:
              "2026-09-29"
          });

      expect(
        response.status
      ).toBe(400);
    }
  );

  test(
    "POST /api/transactions rejects a category/type mismatch",
    async () => {
      const response =
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
            type: "EXPENSE",
            amount: "100",
            transactionDate:
              "2026-09-29"
          });

      expect(
        response.status
      ).toBe(400);
    }
  );

  test(
    "PATCH /api/transactions/:id updates a transaction",
    async () => {
      const createResponse =
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
              "Old description",
            transactionDate:
              "2026-09-29"
          });

      expect(
        createResponse.status
      ).toBe(201);

      const transactionId =
        createResponse.body.id;

      const response =
        await request(app)
          .patch(
            `/api/transactions/${transactionId}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            amount: "250",
            description:
              "Updated description"
          });

      expect(
        response.status
      ).toBe(200);

      expect(
        Number(
          response.body.amount
        )
      ).toBe(250);

      expect(
        response.body.description
      ).toBe(
        "Updated description"
      );
    }
  );

  test(
    "PATCH /api/transactions/:id rejects an invalid ID",
    async () => {
      const response =
        await request(app)
          .patch(
            "/api/transactions/not-a-uuid"
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            amount: "100"
          });

      expect(
        response.status
      ).toBe(400);
    }
  );

  test(
    "DELETE /api/transactions/:id deletes a transaction",
    async () => {
      const createResponse =
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
            transactionDate:
              "2026-09-29"
          });

      expect(
        createResponse.status
      ).toBe(201);

      const transactionId =
        createResponse.body.id;

      const response =
        await request(app)
          .delete(
            `/api/transactions/${transactionId}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          );

      expect(
        response.status
      ).toBe(204);

      const transaction =
        await prisma.transaction.findUnique({
          where: {
            id: transactionId
          }
        });

      expect(
        transaction
      ).toBeNull();
    }
  );

  test(
    "PATCH cannot reduce an income transaction below its savings allocations",
    async () => {
      const transaction =
        await createIncomeTransaction(
          "1000"
        );

      const goal =
        await createSavingsGoal();

      await createContribution({
        savingsGoalId: goal.id,
        transactionId:
          transaction.id,
        amount: "700"
      });

      const response =
        await request(app)
          .patch(
            `/api/transactions/${transaction.id}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            amount: "699"
          });

      expect(
        response.status
      ).toBe(400);

      expect(
        response.body.error
      ).toBe(
        "Transaction amount cannot be reduced below the amount already allocated to savings goals"
      );

      const storedTransaction =
        await prisma.transaction.findUnique({
          where: {
            id: transaction.id
          }
        });

      expect(
        Number(
          storedTransaction.amount
        )
      ).toBe(1000);
    }
  );

  test(
    "PATCH cannot change an income transaction with savings allocations to an expense",
    async () => {
      const transaction =
        await createIncomeTransaction(
          "1000"
        );

      const goal =
        await createSavingsGoal();

      await createContribution({
        savingsGoalId: goal.id,
        transactionId:
          transaction.id,
        amount: "300"
      });

      const response =
        await request(app)
          .patch(
            `/api/transactions/${transaction.id}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            type: "EXPENSE",
            categoryId:
              expenseCategoryId
          });

      expect(
        response.status
      ).toBe(400);

      expect(
        response.body.error
      ).toBe(
        "A transaction with savings contributions must remain an income transaction"
      );

      const storedTransaction =
        await prisma.transaction.findUnique({
          where: {
            id: transaction.id
          }
        });

      expect(
        storedTransaction.type
      ).toBe("INCOME");
    }
  );

  test(
    "PATCH cannot move a savings-backed income transaction to an account with a different currency",
    async () => {
      const transaction =
        await createIncomeTransaction(
          "1000"
        );

      const goal =
        await createSavingsGoal();

      await createContribution({
        savingsGoalId: goal.id,
        transactionId:
          transaction.id,
        amount: "300"
      });

      const euroAccountResponse =
        await request(app)
          .post("/api/accounts")
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            name:
              "Transaction Euro Bank",
            type: "BANK",
            currencyCode: "EUR",
            openingBalance: "1000"
          });

      expect(
        euroAccountResponse.status
      ).toBe(201);

      const response =
        await request(app)
          .patch(
            `/api/transactions/${transaction.id}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            accountId:
              euroAccountResponse.body.id
          });

      expect(
        response.status
      ).toBe(400);

      expect(
        response.body.error
      ).toBe(
        "A transaction with savings contributions cannot be moved to an account with a different currency"
      );

      const storedTransaction =
        await prisma.transaction.findUnique({
          where: {
            id: transaction.id
          }
        });

      expect(
        storedTransaction.accountId
      ).toBe(accountId);

      expect(
        storedTransaction.currencyCode
      ).toBe("USD");
    }
  );

  test(
    "PATCH allows safe changes to an income transaction with savings allocations",
    async () => {
      const transaction =
        await createIncomeTransaction(
          "1000"
        );

      const goal =
        await createSavingsGoal();

      await createContribution({
        savingsGoalId: goal.id,
        transactionId:
          transaction.id,
        amount: "700"
      });

      const secondAccountResponse =
        await request(app)
          .post("/api/accounts")
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            name:
              "Second USD Bank",
            type: "BANK",
            currencyCode: "USD",
            openingBalance: "500"
          });

      expect(
        secondAccountResponse.status
      ).toBe(201);

      const response =
        await request(app)
          .patch(
            `/api/transactions/${transaction.id}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            accountId:
              secondAccountResponse.body.id,
            amount: "1200",
            description:
              "Safely updated income",
            transactionDate:
              "2026-09-30"
          });

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.accountId
      ).toBe(
        secondAccountResponse.body.id
      );

      expect(
        Number(
          response.body.amount
        )
      ).toBe(1200);

      expect(
        response.body.currencyCode
      ).toBe("USD");

      expect(
        response.body.description
      ).toBe(
        "Safely updated income"
      );
    }
  );

  test(
    "concurrent transaction reduction and savings contribution cannot leave allocations above the income amount",
    async () => {
      const transaction =
        await createIncomeTransaction(
          "1000"
        );

      const goal =
        await createSavingsGoal(
          "2000"
        );

      const patchRequest =
        request(app)
          .patch(
            `/api/transactions/${transaction.id}`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            amount: "500"
          });

      const contributionRequest =
        request(app)
          .post(
            `/api/savings-goals/${goal.id}/contributions`
          )
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send({
            transactionId:
              transaction.id,
            amount: "700"
          });

      const [
        patchResponse,
        contributionResponse
      ] = await Promise.all([
        patchRequest,
        contributionRequest
      ]);

      expect([
        200,
        400
      ]).toContain(
        patchResponse.status
      );

      expect([
        201,
        400
      ]).toContain(
        contributionResponse.status
      );

      const storedTransaction =
        await prisma.transaction.findUnique({
          where: {
            id: transaction.id
          }
        });

      const contributionSummary =
        await prisma.savingsGoalContribution.aggregate({
          where: {
            transactionId:
              transaction.id
          },

          _sum: {
            amount: true
          }
        });

      const finalIncomeAmount =
        Number(
          storedTransaction.amount
        );

      const finalAllocatedAmount =
        Number(
          contributionSummary._sum.amount ??
            0
        );

      expect(
        finalAllocatedAmount
      ).toBeLessThanOrEqual(
        finalIncomeAmount
      );
    }
  );
});
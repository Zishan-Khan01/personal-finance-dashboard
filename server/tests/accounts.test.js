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

const TEST_EMAIL = "vitest.accounts@example.com";
const TEST_PASSWORD = "TestAccounts@2026";

let accessToken;

async function registerTestUser() {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Vitest Accounts User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

  expect(response.status).toBe(201);

  accessToken = response.body.accessToken;
}

async function createTestCurrency() {
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
}

async function createAccount({
  name = "Test Bank",
  type = "BANK",
  currencyCode = "USD",
  openingBalance = "10000"
} = {}) {
  const response = await request(app)
    .post("/api/accounts")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name,
      type,
      currencyCode,
      openingBalance
    });

  expect(response.status).toBe(201);

  return response.body;
}

async function createCategory(type, name) {
  const response = await request(app)
    .post("/api/categories")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name,
      type
    });

  expect(response.status).toBe(201);

  return response.body;
}

async function getTestUser() {
  const user = await prisma.user.findUnique({
    where: {
      email: TEST_EMAIL
    }
  });

  expect(user).not.toBeNull();

  return user;
}

describe("Accounts API", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await createTestCurrency();
    await registerTestUser();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await prisma.$disconnect();
  });

  test("GET /api/accounts initially returns an empty array", async () => {
    const response = await request(app)
      .get("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("POST /api/accounts creates an account", async () => {
    const response = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Test Bank",
        type: "BANK",
        currencyCode: "USD",
        openingBalance: "10000"
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      name: "Test Bank",
      type: "BANK",
      currencyCode: "USD",
      isActive: true
    });

    expect(response.body.id).toBeDefined();

    expect(
      Number(response.body.openingBalance)
    ).toBe(10000);
  });

  test("POST /api/accounts rejects an invalid account type", async () => {
    const response = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Invalid Account",
        type: "INVALID_TYPE",
        currencyCode: "USD",
        openingBalance: "1000"
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error:
        "name, type, currencyCode, and openingBalance are invalid"
    });
  });

  test("POST /api/accounts rejects a currency that does not exist", async () => {
    const response = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Invalid Currency Account",
        type: "BANK",
        currencyCode: "XYZ",
        openingBalance: "1000"
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: "Invalid currency"
    });
  });

  test("PATCH /api/accounts/:id updates an account", async () => {
    const createResponse = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Test Bank",
        type: "BANK",
        currencyCode: "USD",
        openingBalance: "10000"
      });

    expect(createResponse.status).toBe(201);

    const accountId =
      createResponse.body.id;

    const response = await request(app)
      .patch(`/api/accounts/${accountId}`)
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Updated Test Bank",
        type: "WALLET",
        openingBalance: "15000"
      });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      id: accountId,
      name: "Updated Test Bank",
      type: "WALLET",
      currencyCode: "USD"
    });

    expect(
      Number(response.body.openingBalance)
    ).toBe(15000);
  });

  test("PATCH /api/accounts/:id can deactivate and restore an account", async () => {
    const createResponse = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Archive Test Account",
        type: "BANK",
        currencyCode: "USD",
        openingBalance: "500"
      });

    const accountId =
      createResponse.body.id;

    const deactivateResponse =
      await request(app)
        .patch(`/api/accounts/${accountId}`)
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          isActive: false
        });

    expect(
      deactivateResponse.status
    ).toBe(200);

    expect(
      deactivateResponse.body.isActive
    ).toBe(false);

    const restoreResponse =
      await request(app)
        .patch(`/api/accounts/${accountId}`)
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          isActive: true
        });

    expect(
      restoreResponse.status
    ).toBe(200);

    expect(
      restoreResponse.body.isActive
    ).toBe(true);
  });

  test("PATCH /api/accounts/:id rejects an invalid account ID", async () => {
    const response = await request(app)
      .patch("/api/accounts/not-a-uuid")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Updated Account"
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: "Invalid account ID"
    });
  });

  test("DELETE /api/accounts/:id deletes an unused account", async () => {
    const createResponse = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Delete Test Account",
        type: "CASH",
        currencyCode: "USD",
        openingBalance: "100"
      });

    const accountId =
      createResponse.body.id;

    const deleteResponse =
      await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        );

    expect(deleteResponse.status).toBe(204);

    const account =
      await prisma.account.findUnique({
        where: {
          id: accountId
        }
      });

    expect(account).toBeNull();
  });

  test("users cannot update another user's account", async () => {
    const createResponse = await request(app)
      .post("/api/accounts")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Private Account",
        type: "BANK",
        currencyCode: "USD",
        openingBalance: "1000"
      });

    const accountId =
      createResponse.body.id;

    const secondUserResponse =
      await request(app)
        .post("/api/auth/register")
        .send({
          name: "Second Vitest User",
          email:
            "vitest.accounts.second@example.com",
          password: "SecondUser@2026"
        });

    expect(
      secondUserResponse.status
    ).toBe(201);

    const secondToken =
      secondUserResponse.body.accessToken;

    const response = await request(app)
      .patch(`/api/accounts/${accountId}`)
      .set(
        "Authorization",
        `Bearer ${secondToken}`
      )
      .send({
        name: "Stolen Account"
      });

    expect(response.status).toBe(404);

    const account =
      await prisma.account.findUnique({
        where: {
          id: accountId
        }
      });

    expect(account.name).toBe(
      "Private Account"
    );

    await prisma.user.deleteMany({
      where: {
        email:
          "vitest.accounts.second@example.com"
      }
    });
  });

  test("account currency cannot change after a transaction exists", async () => {
    const account = await createAccount();

    const category =
      await createCategory(
        "INCOME",
        "Account Integrity Income"
      );

    const transactionResponse =
      await request(app)
        .post("/api/transactions")
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          accountId: account.id,
          categoryId: category.id,
          type: "INCOME",
          amount: "100",
          description:
            "Account integrity test",
          transactionDate:
            "2026-09-29"
        });

    expect(
      transactionResponse.status
    ).toBe(201);

    const response = await request(app)
      .patch(`/api/accounts/${account.id}`)
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        currencyCode: "EUR"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Account currency cannot be changed after financial activity has been added"
    );

    const storedAccount =
      await prisma.account.findUnique({
        where: {
          id: account.id
        }
      });

    expect(
      storedAccount.currencyCode
    ).toBe("USD");
  });

  test("account opening balance cannot change after a transaction exists", async () => {
    const account = await createAccount({
      openingBalance: "1000"
    });

    const category =
      await createCategory(
        "EXPENSE",
        "Opening Balance Integrity"
      );

    const transactionResponse =
      await request(app)
        .post("/api/transactions")
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          accountId: account.id,
          categoryId: category.id,
          type: "EXPENSE",
          amount: "50",
          description:
            "Opening balance test",
          transactionDate:
            "2026-09-29"
        });

    expect(
      transactionResponse.status
    ).toBe(201);

    const response = await request(app)
      .patch(`/api/accounts/${account.id}`)
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        openingBalance: "5000"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Opening balance cannot be changed after transactions or transfers have been added"
    );

    const storedAccount =
      await prisma.account.findUnique({
        where: {
          id: account.id
        }
      });

    expect(
      Number(storedAccount.openingBalance)
    ).toBe(1000);
  });

  test("account currency cannot change after a transfer exists", async () => {
    const fromAccount =
      await createAccount({
        name: "Transfer Source"
      });

    const toAccount =
      await createAccount({
        name: "Transfer Destination"
      });

    const transferResponse =
      await request(app)
        .post("/api/transfers")
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          fromAccountId:
            fromAccount.id,
          toAccountId:
            toAccount.id,
          amount: "100",
          description:
            "Account currency integrity transfer",
          transferDate:
            "2026-09-29"
        });

    expect(
      transferResponse.status
    ).toBe(201);

    const response = await request(app)
      .patch(
        `/api/accounts/${fromAccount.id}`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        currencyCode: "EUR"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Account currency cannot be changed after financial activity has been added"
    );
  });

  test("account currency cannot change when a recurring transaction exists", async () => {
    const account = await createAccount();

    const category =
      await createCategory(
        "EXPENSE",
        "Recurring Integrity Expense"
      );

    const user = await getTestUser();

    await prisma.recurringTransaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        type: "EXPENSE",
        amount: "25",
        currencyCode: "USD",
        description:
          "Recurring integrity test",
        frequency: "MONTHLY",
        startDate:
          new Date("2026-10-01"),
        nextRunDate:
          new Date("2026-10-01"),
        active: true
      }
    });

    const response = await request(app)
      .patch(`/api/accounts/${account.id}`)
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        currencyCode: "EUR"
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Account currency cannot be changed after financial activity has been added"
    );

    const storedAccount =
      await prisma.account.findUnique({
        where: {
          id: account.id
        }
      });

    expect(
      storedAccount.currencyCode
    ).toBe("USD");
  });

  test("name, type, and active status can still change after financial activity exists", async () => {
    const account = await createAccount();

    const category =
      await createCategory(
        "INCOME",
        "Normal Account Update Income"
      );

    const transactionResponse =
      await request(app)
        .post("/api/transactions")
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          accountId: account.id,
          categoryId: category.id,
          type: "INCOME",
          amount: "100",
          description:
            "Normal account update test",
          transactionDate:
            "2026-09-29"
        });

    expect(
      transactionResponse.status
    ).toBe(201);

    const response = await request(app)
      .patch(`/api/accounts/${account.id}`)
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name:
          "Updated Active Account",
        type: "WALLET",
        isActive: false
      });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      id: account.id,
      name:
        "Updated Active Account",
      type: "WALLET",
      currencyCode: "USD",
      isActive: false
    });
  });
});
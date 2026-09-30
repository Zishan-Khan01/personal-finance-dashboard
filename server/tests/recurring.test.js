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
import {
  processRecurringTransactions
} from "../src/services/recurring.js";

const TEST_EMAIL =
  "vitest.recurring@example.com";

const TEST_PASSWORD =
  "TestRecurring@2026";

let accessToken;
let userId;
let accountId;
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

  const registerResponse =
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Vitest Recurring User",
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
        name: "Recurring Bank",
        type: "BANK",
        currencyCode: "USD",
        openingBalance: "5000"
      });

  expect(
    accountResponse.status
  ).toBe(201);

  accountId =
    accountResponse.body.id;

  const categoryResponse =
    await request(app)
      .post("/api/categories")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Recurring Expense",
        type: "EXPENSE"
      });

  expect(
    categoryResponse.status
  ).toBe(201);

  expenseCategoryId =
    categoryResponse.body.id;
}

function recurringPayload(
  overrides = {}
) {
  return {
    accountId,
    categoryId:
      expenseCategoryId,
    type: "EXPENSE",
    amount: "100",
    currencyCode: "USD",
    description:
      "Automated recurring expense",
    frequency: "MONTHLY",
    startDate: "2026-09-01",
    nextRunDate: "2026-10-01",
    ...overrides
  };
}

async function createRecurringDirectly({
  frequency = "MONTHLY",
  startDate,
  nextRunDate,
  endDate = null,
  amount = "100",
  description =
    "Recurring service test"
}) {
  return prisma.recurringTransaction.create({
    data: {
      userId,
      accountId,
      categoryId:
        expenseCategoryId,
      type: "EXPENSE",
      amount,
      currencyCode: "USD",
      description,
      frequency,
      startDate:
        new Date(startDate),
      endDate:
        endDate
          ? new Date(endDate)
          : null,
      nextRunDate:
        new Date(nextRunDate),
      active: true
    }
  });
}

describe(
  "Recurring Transactions API",
  () => {
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
      "POST /api/recurring creates a recurring transaction",
      async () => {
        const response =
          await request(app)
            .post("/api/recurring")
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            )
            .send(
              recurringPayload()
            );

        expect(
          response.status
        ).toBe(201);

        expect(
          response.body
        ).toMatchObject({
          accountId,
          categoryId:
            expenseCategoryId,
          type: "EXPENSE",
          currencyCode: "USD",
          frequency: "MONTHLY",
          active: true
        });

        expect(
          Number(
            response.body.amount
          )
        ).toBe(100);
      }
    );

    test(
      "GET /api/recurring returns recurring transactions",
      async () => {
        await request(app)
          .post("/api/recurring")
          .set(
            "Authorization",
            `Bearer ${accessToken}`
          )
          .send(
            recurringPayload()
          )
          .expect(201);

        const response =
          await request(app)
            .get("/api/recurring")
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body
        ).toHaveLength(1);
      }
    );

    test(
      "POST /api/recurring rejects an invalid frequency",
      async () => {
        const response =
          await request(app)
            .post("/api/recurring")
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            )
            .send(
              recurringPayload({
                frequency: "HOURLY"
              })
            );

        expect(
          response.status
        ).toBe(400);
      }
    );

    test(
      "POST /api/recurring rejects nextRunDate before startDate",
      async () => {
        const response =
          await request(app)
            .post("/api/recurring")
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            )
            .send(
              recurringPayload({
                startDate:
                  "2026-10-01",
                nextRunDate:
                  "2026-09-01"
              })
            );

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body.error
        ).toBe(
          "nextRunDate cannot be before startDate"
        );
      }
    );

    test(
      "PATCH /api/recurring/:id updates a recurring transaction",
      async () => {
        const createResponse =
          await request(app)
            .post("/api/recurring")
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            )
            .send(
              recurringPayload()
            );

        expect(
          createResponse.status
        ).toBe(201);

        const recurringId =
          createResponse.body.id;

        const response =
          await request(app)
            .patch(
              `/api/recurring/${recurringId}`
            )
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            )
            .send({
              amount: "250",
              description:
                "Updated recurring expense",
              active: false
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
          "Updated recurring expense"
        );

        expect(
          response.body.active
        ).toBe(false);
      }
    );

    test(
      "DELETE /api/recurring/:id deletes a recurring transaction",
      async () => {
        const createResponse =
          await request(app)
            .post("/api/recurring")
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            )
            .send(
              recurringPayload()
            );

        expect(
          createResponse.status
        ).toBe(201);

        const response =
          await request(app)
            .delete(
              `/api/recurring/${createResponse.body.id}`
            )
            .set(
              "Authorization",
              `Bearer ${accessToken}`
            );

        expect(
          response.status
        ).toBe(204);
      }
    );

    test(
      "processor does not generate transactions for an inactive account",
      async () => {
        const recurring =
          await createRecurringDirectly({
            frequency: "DAILY",
            startDate:
              "2026-09-01T00:00:00.000Z",
            nextRunDate:
              "2026-09-01T00:00:00.000Z",
            description:
              "Inactive account test"
          });

        await prisma.account.update({
          where: {
            id: accountId
          },

          data: {
            isActive: false
          }
        });

        const results =
          await processRecurringTransactions();

        expect(
          results
        ).toHaveLength(0);

        const generatedTransactions =
          await prisma.transaction.findMany({
            where: {
              recurringTransactionId:
                recurring.id
            }
          });

        expect(
          generatedTransactions
        ).toHaveLength(0);

        const storedRecurring =
          await prisma.recurringTransaction.findUnique({
            where: {
              id: recurring.id
            }
          });

        expect(
          storedRecurring.nextRunDate.toISOString()
        ).toBe(
          "2026-09-01T00:00:00.000Z"
        );

        expect(
          storedRecurring.active
        ).toBe(true);
      }
    );

    test(
      "monthly recurrence safely handles the end of a month",
      async () => {
        const recurring =
          await createRecurringDirectly({
            frequency: "MONTHLY",
            startDate:
              "2026-01-31T00:00:00.000Z",
            nextRunDate:
              "2026-01-31T00:00:00.000Z",
            description:
              "Month end test"
          });

        const results =
          await processRecurringTransactions();

        expect(
          results
        ).toHaveLength(1);

        expect(
          results[0]
            .transactionDate
            .toISOString()
        ).toBe(
          "2026-01-31T00:00:00.000Z"
        );

        const storedRecurring =
          await prisma.recurringTransaction.findUnique({
            where: {
              id: recurring.id
            }
          });

        expect(
          storedRecurring.nextRunDate.toISOString()
        ).toBe(
          "2026-02-28T00:00:00.000Z"
        );
      }
    );

    test(
      "yearly recurrence safely handles February 29",
      async () => {
        const recurring =
          await createRecurringDirectly({
            frequency: "YEARLY",
            startDate:
              "2024-02-29T00:00:00.000Z",
            nextRunDate:
              "2024-02-29T00:00:00.000Z",
            description:
              "Leap year test"
          });

        const results =
          await processRecurringTransactions();

        expect(
          results
        ).toHaveLength(1);

        expect(
          results[0]
            .transactionDate
            .toISOString()
        ).toBe(
          "2024-02-29T00:00:00.000Z"
        );

        const storedRecurring =
          await prisma.recurringTransaction.findUnique({
            where: {
              id: recurring.id
            }
          });

        expect(
          storedRecurring.nextRunDate.toISOString()
        ).toBe(
          "2025-02-28T00:00:00.000Z"
        );
      }
    );

    test(
      "concurrent recurring processing does not create duplicate transactions",
      async () => {
        const scheduledDate =
          new Date(
            Date.now() - 60 * 1000
          );

        const expectedNextRunDate =
          new Date(scheduledDate);

        expectedNextRunDate.setUTCDate(
          expectedNextRunDate.getUTCDate() + 1
        );

        const recurring =
          await createRecurringDirectly({
            frequency: "DAILY",
            startDate:
              scheduledDate.toISOString(),
            nextRunDate:
              scheduledDate.toISOString(),
            description:
              "Concurrent processor test"
          });

        const firstRun =
          processRecurringTransactions();

        const secondRun =
          processRecurringTransactions();

        await Promise.all([
          firstRun,
          secondRun
        ]);

        const generatedTransactions =
          await prisma.transaction.findMany({
            where: {
              recurringTransactionId:
                recurring.id,
              transactionDate:
                scheduledDate
            }
          });

        expect(
          generatedTransactions
        ).toHaveLength(1);

        const allGeneratedTransactions =
          await prisma.transaction.findMany({
            where: {
              recurringTransactionId:
                recurring.id
            }
          });

        expect(
          allGeneratedTransactions
        ).toHaveLength(1);

        const storedRecurring =
          await prisma.recurringTransaction.findUnique({
            where: {
              id: recurring.id
            }
          });

        expect(
          storedRecurring.nextRunDate.toISOString()
        ).toBe(
          expectedNextRunDate.toISOString()
        );
      }
    );
  }
);
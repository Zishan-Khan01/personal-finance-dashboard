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

const TEST_EMAIL = "vitest.transfers@example.com";
const TEST_PASSWORD = "TestTransfers@2026";

let accessToken;
let firstAccountId;
let secondAccountId;

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
      name: "Vitest Transfers User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

  accessToken = registerResponse.body.accessToken;

  const firstAccount = await request(app)
    .post("/api/accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Transfer Bank",
      type: "BANK",
      currencyCode: "USD",
      openingBalance: "5000"
    });

  firstAccountId = firstAccount.body.id;

  const secondAccount = await request(app)
    .post("/api/accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Transfer Wallet",
      type: "WALLET",
      currencyCode: "USD",
      openingBalance: "1000"
    });

  secondAccountId = secondAccount.body.id;
}

describe("Transfers API", () => {
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

  test("GET /api/transfers initially returns an empty array", async () => {
    const response = await request(app)
      .get("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("POST /api/transfers creates a transfer", async () => {
    const response = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fromAccountId: firstAccountId,
        toAccountId: secondAccountId,
        amount: "500",
        description: "Automated transfer",
        transferDate: "2026-09-29"
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      fromAccountId: firstAccountId,
      toAccountId: secondAccountId,
      currencyCode: "USD",
      description: "Automated transfer"
    });

    expect(Number(response.body.amount)).toBe(500);
  });

  test("POST /api/transfers rejects a same-account transfer", async () => {
    const response = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fromAccountId: firstAccountId,
        toAccountId: firstAccountId,
        amount: "100",
        transferDate: "2026-09-29"
      });

    expect(response.status).toBe(400);
  });

  test("POST /api/transfers rejects an invalid amount", async () => {
    const response = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fromAccountId: firstAccountId,
        toAccountId: secondAccountId,
        amount: "0",
        transferDate: "2026-09-29"
      });

    expect(response.status).toBe(400);
  });

  test("PATCH /api/transfers/:id updates a transfer", async () => {
    const createResponse = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fromAccountId: firstAccountId,
        toAccountId: secondAccountId,
        amount: "500",
        description: "Old transfer",
        transferDate: "2026-09-29"
      });

    const transferId = createResponse.body.id;

    const response = await request(app)
      .patch(`/api/transfers/${transferId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        amount: "750",
        description: "Updated transfer"
      });

    expect(response.status).toBe(200);
    expect(Number(response.body.amount)).toBe(750);
    expect(response.body.description).toBe(
      "Updated transfer"
    );
  });

  test("DELETE /api/transfers/:id deletes a transfer", async () => {
    const createResponse = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fromAccountId: firstAccountId,
        toAccountId: secondAccountId,
        amount: "500",
        transferDate: "2026-09-29"
      });

    const response = await request(app)
      .delete(
        `/api/transfers/${createResponse.body.id}`
      )
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
  });
});
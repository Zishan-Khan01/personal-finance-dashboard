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

const TEST_EMAIL = "vitest.categories@example.com";
const TEST_PASSWORD = "TestCategories@2026";

let accessToken;

async function registerUser() {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Vitest Categories User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

  expect(response.status).toBe(201);

  accessToken = response.body.accessToken;
}

describe("Categories API", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await registerUser();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await prisma.$disconnect();
  });

  test("POST /api/categories creates an expense category", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Test Food",
        type: "EXPENSE"
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      name: "Test Food",
      type: "EXPENSE"
    });

    expect(response.body.id).toBeDefined();
  });

  test("POST /api/categories creates an income category", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Test Salary",
        type: "INCOME"
      });

    expect(response.status).toBe(201);

    expect(response.body.type).toBe("INCOME");
  });

  test("GET /api/categories returns the user's categories", async () => {
    await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Vitest Category",
        type: "EXPENSE"
      })
      .expect(201);

    const response = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (category) =>
          category.name === "Vitest Category"
      )
    ).toBe(true);
  });

  test("POST /api/categories rejects an invalid type", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Invalid Category",
        type: "INVALID"
      });

    expect(response.status).toBe(400);
  });

  test("POST /api/categories creates a child category with the same type", async () => {
    const parentResponse = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Parent Expense",
        type: "EXPENSE"
      });

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Child Expense",
        type: "EXPENSE",
        parentId: parentResponse.body.id
      });

    expect(response.status).toBe(201);

    expect(response.body.parentId).toBe(
      parentResponse.body.id
    );
  });

  test("POST /api/categories rejects a parent with a different type", async () => {
    const parentResponse = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Income Parent",
        type: "INCOME"
      });

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Expense Child",
        type: "EXPENSE",
        parentId: parentResponse.body.id
      });

    expect(response.status).toBe(400);
  });
});
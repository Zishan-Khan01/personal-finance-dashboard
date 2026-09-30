import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const TEST_EMAIL = "vitest.auth@example.com";
const TEST_PASSWORD = "TestAuth@2026";

describe("Authentication API", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL
      }
    });

    await prisma.$disconnect();
  });

  test("POST /api/auth/register creates a new user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Vitest Auth User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    expect(response.status).toBe(201);

    expect(response.body.user).toMatchObject({
      name: "Vitest Auth User",
      email: TEST_EMAIL
    });

    expect(response.body.user.id).toBeDefined();
    expect(response.body.accessToken).toEqual(
      expect.any(String)
    );

    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test("POST /api/auth/register rejects invalid registration data", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "",
        email: "invalid-email",
        password: "short"
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error:
        "Name, a valid email, and a password of at least 8 characters are required"
    });
  });

  test("POST /api/auth/register rejects a duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Vitest Auth User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
      .expect(201);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Another User",
        email: TEST_EMAIL,
        password: "AnotherPassword@2026"
      });

    expect(response.status).not.toBe(201);
  });

  test("POST /api/auth/login logs in with correct credentials", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Vitest Auth User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
      .expect(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    expect(response.status).toBe(200);

    expect(response.body.user).toMatchObject({
      name: "Vitest Auth User",
      email: TEST_EMAIL
    });

    expect(response.body.accessToken).toEqual(
      expect.any(String)
    );

    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test("POST /api/auth/login rejects an incorrect password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Vitest Auth User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
      .expect(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: TEST_EMAIL,
        password: "WrongPassword@2026"
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: "Invalid email or password"
    });
  });

  test("protected API rejects a request without an access token", async () => {
    const response = await request(app)
      .get("/api/accounts");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: "Authentication required"
    });
  });

  test("access token allows access to a protected API", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Vitest Auth User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.accessToken;

    const response = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
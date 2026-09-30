import {
  describe,
  expect,
  test
} from "vitest";

import request from "supertest";

import app from "../src/app.js";

describe("Health API", () => {
  test(
    "GET /api/health returns API health status",
    async () => {
      const response =
        await request(app)
          .get("/api/health");

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body
      ).toEqual({
        status: "ok"
      });
    }
  );

  test(
    "GET /api/health includes Helmet security headers",
    async () => {
      const response =
        await request(app)
          .get("/api/health");

      expect(
        response.status
      ).toBe(200);

      expect(
        response.headers[
          "x-content-type-options"
        ]
      ).toBe("nosniff");

      expect(
        response.headers[
          "x-frame-options"
        ]
      ).toBeDefined();

      expect(
        response.headers[
          "content-security-policy"
        ]
      ).toBeDefined();
    }
  );

  test(
    "GET /api/health does not expose the Express X-Powered-By header",
    async () => {
      const response =
        await request(app)
          .get("/api/health");

      expect(
        response.status
      ).toBe(200);

      expect(
        response.headers[
          "x-powered-by"
        ]
      ).toBeUndefined();
    }
  );

  test(
    "CORS allows the configured frontend origin",
    async () => {
      const frontendOrigin =
        process.env.FRONTEND_ORIGIN ||
        "http://localhost:5173";

      const response =
        await request(app)
          .get("/api/health")
          .set(
            "Origin",
            frontendOrigin
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.headers[
          "access-control-allow-origin"
        ]
      ).toBe(frontendOrigin);
    }
  );

  test(
    "CORS does not grant access to an unapproved origin",
    async () => {
      const response =
        await request(app)
          .get("/api/health")
          .set(
            "Origin",
            "https://malicious.example"
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.headers[
          "access-control-allow-origin"
        ]
      ).toBeUndefined();
    }
  );

  test(
    "API rejects JSON request bodies larger than 100 KB",
    async () => {
      const oversizedPayload = {
        email:
          "oversized@example.com",
        password:
          "A".repeat(
            101 * 1024
          )
      };

      const response =
        await request(app)
          .post("/api/auth/login")
          .send(
            oversizedPayload
          );

      expect(
        response.status
      ).toBe(413);
    }
  );
});
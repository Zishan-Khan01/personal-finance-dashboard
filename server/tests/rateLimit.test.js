import {
  describe,
  expect,
  test
} from "vitest";

import express from "express";
import request from "supertest";

import {
  createApiLimiter,
  createAuthLimiter
} from "../src/middleware/rateLimiters.js";

describe("Rate Limiting", () => {
  test(
    "authentication limiter allows 20 requests and blocks the 21st",
    async () => {
      const app = express();

      app.use(
        createAuthLimiter()
      );

      app.get(
        "/test",
        (req, res) => {
          res.status(200).json({
            status: "ok"
          });
        }
      );

      for (
        let requestNumber = 1;
        requestNumber <= 20;
        requestNumber += 1
      ) {
        const response =
          await request(app)
            .get("/test");

        expect(
          response.status
        ).toBe(200);
      }

      const blockedResponse =
        await request(app)
          .get("/test");

      expect(
        blockedResponse.status
      ).toBe(429);

      expect(
        blockedResponse.body
      ).toEqual({
        error:
          "Too many authentication attempts. Please try again later."
      });
    }
  );

  test(
    "general API limiter allows 300 requests and blocks the 301st",
    async () => {
      const app = express();

      app.use(
        createApiLimiter()
      );

      app.get(
        "/test",
        (req, res) => {
          res.status(200).json({
            status: "ok"
          });
        }
      );

      for (
        let requestNumber = 1;
        requestNumber <= 300;
        requestNumber += 1
      ) {
        const response =
          await request(app)
            .get("/test");

        expect(
          response.status
        ).toBe(200);
      }

      const blockedResponse =
        await request(app)
          .get("/test");

      expect(
        blockedResponse.status
      ).toBe(429);

      expect(
        blockedResponse.body
      ).toEqual({
        error:
          "Too many requests. Please try again later."
      });
    },
    15000
  );
});
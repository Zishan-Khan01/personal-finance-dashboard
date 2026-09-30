import {
  afterEach,
  describe,
  expect,
  test,
  vi
} from "vitest";

import express from "express";
import request from "supertest";

import {
  errorHandler,
  notFound
} from "../src/middleware/errors.js";

function createErrorTestApp() {
  const app = express();

  app.get(
    "/unexpected-error",
    (req, res, next) => {
      next(
        new Error(
          "Sensitive internal database failure"
        )
      );
    }
  );

  app.get(
    "/known-error",
    (req, res, next) => {
      const error =
        new Error(
          "Invalid request data"
        );

      error.statusCode = 400;

      next(error);
    }
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

describe(
  "Production error handling",
  () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test(
      "unexpected errors return a generic 500 response without leaking internal details",
      async () => {
        const consoleErrorSpy =
          vi.spyOn(
            console,
            "error"
          ).mockImplementation(
            () => {}
          );

        const app =
          createErrorTestApp();

        const response =
          await request(app)
            .get(
              "/unexpected-error"
            );

        expect(
          response.status
        ).toBe(500);

        expect(
          response.body
        ).toEqual({
          error:
            "Unexpected server error"
        });

        expect(
          JSON.stringify(
            response.body
          )
        ).not.toContain(
          "Sensitive internal database failure"
        );

        expect(
          JSON.stringify(
            response.body
          )
        ).not.toContain(
          "stack"
        );

        expect(
          consoleErrorSpy
        ).toHaveBeenCalled();
      }
    );

    test(
      "known application errors preserve their intended 4xx response",
      async () => {
        const consoleErrorSpy =
          vi.spyOn(
            console,
            "error"
          ).mockImplementation(
            () => {}
          );

        const app =
          createErrorTestApp();

        const response =
          await request(app)
            .get(
              "/known-error"
            );

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body
        ).toEqual({
          error:
            "Invalid request data"
        });

        expect(
          consoleErrorSpy
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "unknown routes return 404 without exposing internal information",
      async () => {
        const app =
          createErrorTestApp();

        const response =
          await request(app)
            .get(
              "/does-not-exist"
            );

        expect(
          response.status
        ).toBe(404);

        expect(
          response.body
        ).toEqual({
          error:
            "Route not found: GET /does-not-exist"
        });
      }
    );
  }
);
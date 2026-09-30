import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test
} from "vitest";

import {
  validateEnvironment
} from "../src/lib/env.js";

const originalEnvironment = {
  DATABASE_URL:
    process.env.DATABASE_URL,

  AUTH_TOKEN_SECRET:
    process.env.AUTH_TOKEN_SECRET,

  FRONTEND_ORIGIN:
    process.env.FRONTEND_ORIGIN,

  NODE_ENV:
    process.env.NODE_ENV
};

function setValidEnvironment() {
  process.env.DATABASE_URL =
    "postgresql://testuser:testpassword@localhost:5432/test_database";

  process.env.AUTH_TOKEN_SECRET =
    "this-is-a-test-secret-that-is-longer-than-32-characters";

  process.env.FRONTEND_ORIGIN =
    "http://localhost:5173";

  process.env.NODE_ENV =
    "test";
}

function restoreEnvironmentVariable(
  name,
  value
) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe(
  "Environment validation",
  () => {
    beforeEach(() => {
      setValidEnvironment();
    });

    afterEach(() => {
      restoreEnvironmentVariable(
        "DATABASE_URL",
        originalEnvironment.DATABASE_URL
      );

      restoreEnvironmentVariable(
        "AUTH_TOKEN_SECRET",
        originalEnvironment.AUTH_TOKEN_SECRET
      );

      restoreEnvironmentVariable(
        "FRONTEND_ORIGIN",
        originalEnvironment.FRONTEND_ORIGIN
      );

      restoreEnvironmentVariable(
        "NODE_ENV",
        originalEnvironment.NODE_ENV
      );
    });

    test(
      "accepts a valid environment",
      () => {
        expect(
          () =>
            validateEnvironment()
        ).not.toThrow();
      }
    );

    test(
      "rejects a missing DATABASE_URL",
      () => {
        delete process.env.DATABASE_URL;

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "DATABASE_URL environment variable is required"
        );
      }
    );

    test(
      "rejects a non-PostgreSQL DATABASE_URL",
      () => {
        process.env.DATABASE_URL =
          "mysql://localhost/test_database";

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "DATABASE_URL must use the PostgreSQL protocol"
        );
      }
    );

    test(
      "rejects a missing AUTH_TOKEN_SECRET",
      () => {
        delete process.env.AUTH_TOKEN_SECRET;

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "AUTH_TOKEN_SECRET environment variable is required"
        );
      }
    );

    test(
      "rejects an AUTH_TOKEN_SECRET shorter than 32 characters",
      () => {
        process.env.AUTH_TOKEN_SECRET =
          "too-short";

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "AUTH_TOKEN_SECRET must be at least 32 characters long"
        );
      }
    );

    test(
      "rejects a missing FRONTEND_ORIGIN",
      () => {
        delete process.env.FRONTEND_ORIGIN;

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "FRONTEND_ORIGIN environment variable is required"
        );
      }
    );

    test(
      "rejects an invalid FRONTEND_ORIGIN",
      () => {
        process.env.FRONTEND_ORIGIN =
          "not-a-url";

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "FRONTEND_ORIGIN must be a valid URL"
        );
      }
    );

    test(
      "rejects a FRONTEND_ORIGIN containing a path",
      () => {
        process.env.FRONTEND_ORIGIN =
          "https://example.com/app";

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "FRONTEND_ORIGIN must contain only an origin"
        );
      }
    );

    test(
      "rejects an unsupported NODE_ENV value",
      () => {
        process.env.NODE_ENV =
          "staging";

        expect(
          () =>
            validateEnvironment()
        ).toThrow(
          "NODE_ENV must be development, test, or production"
        );
      }
    );
  }
);
const ALLOWED_NODE_ENVIRONMENTS = [
  "development",
  "test",
  "production"
];

function requireEnvironmentVariable(name) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} environment variable is required`
    );
  }

  return value;
}

function validateDatabaseUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL connection URL"
    );
  }

  if (
    url.protocol !== "postgresql:" &&
    url.protocol !== "postgres:"
  ) {
    throw new Error(
      "DATABASE_URL must use the PostgreSQL protocol"
    );
  }
}

function validateAuthTokenSecret(value) {
  if (value.length < 32) {
    throw new Error(
      "AUTH_TOKEN_SECRET must be at least 32 characters long"
    );
  }
}

function validateFrontendOrigin(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "FRONTEND_ORIGIN must be a valid URL"
    );
  }

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "FRONTEND_ORIGIN must use HTTP or HTTPS"
    );
  }

  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "FRONTEND_ORIGIN must contain only an origin"
    );
  }
}

function validateNodeEnvironment(value) {
  if (
    value &&
    !ALLOWED_NODE_ENVIRONMENTS.includes(
      value
    )
  ) {
    throw new Error(
      "NODE_ENV must be development, test, or production"
    );
  }
}

export function validateEnvironment() {
  const databaseUrl =
    requireEnvironmentVariable(
      "DATABASE_URL"
    );

  const authTokenSecret =
    requireEnvironmentVariable(
      "AUTH_TOKEN_SECRET"
    );

  const frontendOrigin =
    requireEnvironmentVariable(
      "FRONTEND_ORIGIN"
    );

  validateDatabaseUrl(
    databaseUrl
  );

  validateAuthTokenSecret(
    authTokenSecret
  );

  validateFrontendOrigin(
    frontendOrigin
  );

  validateNodeEnvironment(
    process.env.NODE_ENV
  );
}
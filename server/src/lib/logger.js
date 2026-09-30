export function logInfo(
  message,
  metadata = {}
) {
  console.log(
    JSON.stringify({
      level: "info",
      message,
      ...metadata,
      timestamp:
        new Date().toISOString()
    })
  );
}

export function logWarning(
  message,
  metadata = {}
) {
  console.warn(
    JSON.stringify({
      level: "warn",
      message,
      ...metadata,
      timestamp:
        new Date().toISOString()
    })
  );
}

export function logError(
  message,
  error,
  metadata = {}
) {
  const errorMetadata = {
    errorName:
      error instanceof Error
        ? error.name
        : "UnknownError",

    errorMessage:
      error instanceof Error
        ? error.message
        : "Unknown error"
  };

  if (
    process.env.NODE_ENV !==
      "production" &&
    error instanceof Error &&
    error.stack
  ) {
    errorMetadata.stack =
      error.stack;
  }

  console.error(
    JSON.stringify({
      level: "error",
      message,
      ...metadata,
      ...errorMetadata,
      timestamp:
        new Date().toISOString()
    })
  );
}
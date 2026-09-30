import { Prisma } from "@prisma/client";

import {
  logError
} from "../lib/logger.js";

export function notFound(
  req,
  res
) {
  res.status(404).json({
    error:
      `Route not found: ${req.method} ${req.path}`
  });
}

export function errorHandler(
  error,
  req,
  res,
  next
) {
  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  ) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error:
          "A record with that value already exists"
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        error:
          "This record is still referenced elsewhere"
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        error:
          "The requested record was not found"
      });
    }
  }

  if (
    error.statusCode &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return res
      .status(error.statusCode)
      .json({
        error:
          error.message ||
          "Request failed"
      });
  }

  logError(
    "Unexpected API error",
    error,
    {
      method: req.method,
      path: req.path
    }
  );

  return res.status(500).json({
    error:
      "Unexpected server error"
  });
}
import { rateLimit } from "express-rate-limit";

export function createApiLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
      error:
        "Too many requests. Please try again later."
    }
  });
}

export function createAuthLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
      error:
        "Too many authentication attempts. Please try again later."
    }
  });
}
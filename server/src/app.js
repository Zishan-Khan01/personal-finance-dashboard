import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.js";
import financeRoutes from "./routes/finance.js";
import transfersRouter from "./routes/transfers.js";
import dashboardRouter from "./routes/dashboard.js";
import budgetRouter from "./routes/budget.js";
import savingsRouter from "./routes/savings.js";
import recurringRouter from "./routes/recurring.js";

import { requireAuth } from "./middleware/auth.js";
import {
  errorHandler,
  notFound
} from "./middleware/errors.js";
import {
  createApiLimiter,
  createAuthLimiter
} from "./middleware/rateLimiters.js";

const app = express();

const frontendOrigin =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173";

const isTestEnvironment =
  process.env.NODE_ENV === "test";

const apiLimiter =
  createApiLimiter();

const authLimiter =
  createAuthLimiter();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin === frontendOrigin
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        null,
        false
      );
    },

    methods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

app.use(
  express.json({
    limit: "100kb"
  })
);

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok"
    });
  }
);

if (isTestEnvironment) {
  app.use(
    "/api/auth",
    authRoutes
  );
} else {
  app.use(
    "/api/auth",
    authLimiter,
    authRoutes
  );

  app.use(
    "/api",
    apiLimiter
  );
}

app.use(
  "/api",
  requireAuth,
  financeRoutes
);

app.use(
  "/api/transfers",
  requireAuth,
  transfersRouter
);

app.use(
  "/api/dashboard",
  requireAuth,
  dashboardRouter
);

app.use(
  "/api/budgets",
  requireAuth,
  budgetRouter
);

app.use(
  "/api/savings-goals",
  requireAuth,
  savingsRouter
);

app.use(
  "/api/recurring",
  requireAuth,
  recurringRouter
);

app.use(notFound);
app.use(errorHandler);

export default app;
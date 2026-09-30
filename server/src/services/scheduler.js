import cron from "node-cron";

import {
  logError,
  logInfo,
  logWarning
} from "../lib/logger.js";

import {
  processRecurringTransactions
} from "./recurring.js";

let isProcessing = false;

export function startScheduler() {
  cron.schedule(
    "* * * * *",
    async () => {
      if (isProcessing) {
        logWarning(
          "Recurring transaction scheduler skipped because the previous run is still processing"
        );

        return;
      }

      isProcessing = true;

      try {
        const transactions =
          await processRecurringTransactions();

        if (
          transactions.length > 0
        ) {
          logInfo(
            "Recurring transactions generated",
            {
              count:
                transactions.length
            }
          );
        }
      } catch (error) {
        logError(
          "Recurring transaction processing failed",
          error
        );
      } finally {
        isProcessing = false;
      }
    }
  );

  logInfo(
    "Recurring transaction scheduler started"
  );
}
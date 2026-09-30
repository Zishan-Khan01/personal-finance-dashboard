/*
  Warnings:

  - A unique constraint covering the columns `[recurringTransactionId,transactionDate]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "transactions_recurringTransactionId_transactionDate_key" ON "transactions"("recurringTransactionId", "transactionDate");

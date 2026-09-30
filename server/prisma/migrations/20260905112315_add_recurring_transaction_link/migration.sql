-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "recurringTransactionId" UUID;

-- CreateIndex
CREATE INDEX "transactions_recurringTransactionId_idx" ON "transactions"("recurringTransactionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

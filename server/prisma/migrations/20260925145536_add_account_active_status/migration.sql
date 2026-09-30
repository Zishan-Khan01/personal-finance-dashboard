-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "accounts_isActive_idx" ON "accounts"("isActive");

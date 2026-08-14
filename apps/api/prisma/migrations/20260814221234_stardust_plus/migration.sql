-- AlterTable: User gets relationship intent + boost timestamp
ALTER TABLE "User" ADD COLUMN "relationshipIntent" TEXT;
ALTER TABLE "User" ADD COLUMN "boostedUntil" TIMESTAMP(3);

-- CreateTable: Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: CompatibilityScore gets an intent column, widen the unique constraint
ALTER TABLE "CompatibilityScore" ADD COLUMN "intent" TEXT;

DROP INDEX "CompatibilityScore_userAId_userBId_key";
CREATE UNIQUE INDEX "CompatibilityScore_userAId_userBId_intent_key" ON "CompatibilityScore"("userAId", "userBId", "intent");

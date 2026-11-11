-- When the order confirmation emails were sent (customer and owner).
ALTER TABLE "Order" ADD COLUMN "customerEmailedAt" TIMESTAMPTZ(3);
ALTER TABLE "Order" ADD COLUMN "ownerEmailedAt" TIMESTAMPTZ(3);

-- Orders paid before this change were already emailed (or email wasn't set up): don't resend.
UPDATE "Order" SET "customerEmailedAt" = COALESCE("paidAt", "updatedAt"), "ownerEmailedAt" = COALESCE("paidAt", "updatedAt")
WHERE "status" NOT IN ('PENDING_PAYMENT', 'EXPIRED');

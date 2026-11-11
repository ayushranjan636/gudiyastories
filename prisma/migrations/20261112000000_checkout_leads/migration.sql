-- Follow-up on checkouts that were started but not paid (Admin → Leads).
-- (Order already has an index on contactPhone.)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "leadStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "leadNote" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "leadUpdatedAt" TIMESTAMPTZ(3);

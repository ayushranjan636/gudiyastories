-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClassMedia" AS ENUM ('IMAGE', 'VIDEO', 'YOUTUBE');

-- AlterEnum
ALTER TYPE "AnalyticsEventType" ADD VALUE 'class_enquiry';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "coverVideoUrl" TEXT;

-- CreateTable
CREATE TABLE "OnlineClass" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "aboutHtml" TEXT NOT NULL DEFAULT '',
    "about" JSONB,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" TEXT,
    "mode" TEXT,
    "schedule" TEXT,
    "startDate" DATE,
    "duration" TEXT NOT NULL,
    "pricePaise" INTEGER,
    "priceNote" TEXT,
    "enquiryUrl" TEXT NOT NULL,
    "mediaKind" "ClassMedia",
    "mediaUrl" TEXT,
    "posterUrl" TEXT,
    "mediaAlt" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'DRAFT',
    "isPopup" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OnlineClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnlineClass_slug_key" ON "OnlineClass"("slug");

-- CreateIndex
CREATE INDEX "OnlineClass_status_startDate_idx" ON "OnlineClass"("status", "startDate");

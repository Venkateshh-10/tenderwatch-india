-- CreateTable
CREATE TABLE "DiscoverySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "rawCount" INTEGER NOT NULL DEFAULT 0,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "newsCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueCount" INTEGER NOT NULL DEFAULT 0,
    "relevantCount" INTEGER NOT NULL DEFAULT 0,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "dataMode" TEXT NOT NULL DEFAULT 'live'
);

-- CreateIndex
CREATE INDEX "DiscoverySession_startedAt_idx" ON "DiscoverySession"("startedAt");

-- AlterTable
ALTER TABLE "SearchRun" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "SearchRun_sessionId_idx" ON "SearchRun"("sessionId");

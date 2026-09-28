-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engine" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "purpose" TEXT NOT NULL,
    "dataMode" TEXT NOT NULL DEFAULT 'live',
    "retrievedAt" DATETIME NOT NULL
);
INSERT INTO "new_SearchRun" ("cacheHit", "engine", "error", "executedAt", "id", "parameters", "purpose", "query", "resultCount", "retrievedAt", "status") SELECT "cacheHit", "engine", "error", "executedAt", "id", "parameters", "purpose", "query", "resultCount", "retrievedAt", "status" FROM "SearchRun";
DROP TABLE "SearchRun";
ALTER TABLE "new_SearchRun" RENAME TO "SearchRun";
CREATE INDEX "SearchRun_executedAt_idx" ON "SearchRun"("executedAt");
CREATE TABLE "new_Tender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tenderReference" TEXT,
    "buyer" TEXT,
    "department" TEXT,
    "organisation" TEXT,
    "primarySourceUrl" TEXT NOT NULL,
    "primarySourceDomain" TEXT NOT NULL,
    "primaryAuthorityTier" TEXT NOT NULL,
    "publicationDate" DATETIME,
    "closingDate" DATETIME,
    "openingDate" DATETIME,
    "estimatedValueInr" REAL,
    "emdInr" REAL,
    "tenderFeeInr" REAL,
    "state" TEXT,
    "location" TEXT,
    "scope" TEXT,
    "categoriesJson" TEXT NOT NULL DEFAULT '[]',
    "requiredCapabilitiesJson" TEXT NOT NULL DEFAULT '[]',
    "turnoverRequirementInr" REAL,
    "experienceRequirementYears" REAL,
    "certificationsRequiredJson" TEXT NOT NULL DEFAULT '[]',
    "msmePreference" BOOLEAN,
    "startupPreference" BOOLEAN,
    "status" TEXT,
    "evidenceCorpus" TEXT NOT NULL DEFAULT '',
    "dataMode" TEXT NOT NULL DEFAULT 'live',
    "lastCheckedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tender" ("buyer", "categoriesJson", "certificationsRequiredJson", "closingDate", "createdAt", "dedupeKey", "department", "emdInr", "estimatedValueInr", "evidenceCorpus", "experienceRequirementYears", "id", "lastCheckedAt", "location", "msmePreference", "openingDate", "organisation", "primaryAuthorityTier", "primarySourceDomain", "primarySourceUrl", "publicationDate", "requiredCapabilitiesJson", "scope", "startupPreference", "state", "status", "tenderFeeInr", "tenderReference", "title", "turnoverRequirementInr", "updatedAt") SELECT "buyer", "categoriesJson", "certificationsRequiredJson", "closingDate", "createdAt", "dedupeKey", "department", "emdInr", "estimatedValueInr", "evidenceCorpus", "experienceRequirementYears", "id", "lastCheckedAt", "location", "msmePreference", "openingDate", "organisation", "primaryAuthorityTier", "primarySourceDomain", "primarySourceUrl", "publicationDate", "requiredCapabilitiesJson", "scope", "startupPreference", "state", "status", "tenderFeeInr", "tenderReference", "title", "turnoverRequirementInr", "updatedAt" FROM "Tender";
DROP TABLE "Tender";
ALTER TABLE "new_Tender" RENAME TO "Tender";
CREATE UNIQUE INDEX "Tender_dedupeKey_key" ON "Tender"("dedupeKey");
CREATE INDEX "Tender_closingDate_idx" ON "Tender"("closingDate");
CREATE INDEX "Tender_lastCheckedAt_idx" ON "Tender"("lastCheckedAt");
CREATE INDEX "Tender_dataMode_idx" ON "Tender"("dataMode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "capabilitiesJson" TEXT NOT NULL,
    "technologiesJson" TEXT NOT NULL,
    "headquarters" TEXT NOT NULL,
    "preferredStatesJson" TEXT NOT NULL,
    "companyAgeYears" INTEGER NOT NULL,
    "annualTurnoverInr" REAL NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "certificationsJson" TEXT NOT NULL,
    "registrationsJson" TEXT NOT NULL,
    "msmeStatus" BOOLEAN NOT NULL,
    "udyamRegistered" BOOLEAN NOT NULL,
    "gstRegistered" BOOLEAN NOT NULL,
    "gemRegistered" BOOLEAN NOT NULL,
    "pastProjectCategoriesJson" TEXT NOT NULL,
    "preferredDepartmentsJson" TEXT NOT NULL,
    "minimumContractValue" REAL,
    "maximumContractValue" REAL,
    "maximumEmd" REAL,
    "excludedCategoriesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SearchRun" (
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
    "retrievedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchRunId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayedLink" TEXT,
    "domain" TEXT NOT NULL,
    "snippet" TEXT,
    "dateText" TEXT,
    "retrievedAt" DATETIME NOT NULL,
    "engine" TEXT NOT NULL,
    "authorityTier" TEXT NOT NULL,
    "fetchStatus" TEXT NOT NULL DEFAULT 'not_attempted',
    "fetchedExcerpt" TEXT,
    CONSTRAINT "Source_searchRunId_fkey" FOREIGN KEY ("searchRunId") REFERENCES "SearchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tender" (
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
    "lastCheckedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TenderSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "TenderSource_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenderSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "numericValue" REAL,
    "unit" TEXT,
    "mandatoryStatus" TEXT NOT NULL,
    "evidenceSourceId" TEXT,
    "evidenceText" TEXT,
    "sourceUrl" TEXT,
    "sourceAuthority" TEXT,
    "evidenceStatus" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Requirement_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadinessEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "blockersJson" TEXT NOT NULL,
    "concernsJson" TEXT NOT NULL,
    "rowsJson" TEXT NOT NULL,
    "matchJson" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadinessEvaluation_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" DATETIME,
    CONSTRAINT "WatchlistItem_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TenderSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "normalizedPayload" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    CONSTRAINT "TenderSnapshot_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TenderChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "evidence" TEXT,
    CONSTRAINT "TenderChange_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SearchRun_executedAt_idx" ON "SearchRun"("executedAt");

-- CreateIndex
CREATE INDEX "Source_searchRunId_idx" ON "Source"("searchRunId");

-- CreateIndex
CREATE INDEX "Source_url_idx" ON "Source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_dedupeKey_key" ON "Tender"("dedupeKey");

-- CreateIndex
CREATE INDEX "Tender_closingDate_idx" ON "Tender"("closingDate");

-- CreateIndex
CREATE INDEX "Tender_lastCheckedAt_idx" ON "Tender"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "TenderSource_tenderId_idx" ON "TenderSource"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "TenderSource_tenderId_sourceId_key" ON "TenderSource"("tenderId", "sourceId");

-- CreateIndex
CREATE INDEX "Requirement_tenderId_idx" ON "Requirement"("tenderId");

-- CreateIndex
CREATE INDEX "ReadinessEvaluation_tenderId_evaluatedAt_idx" ON "ReadinessEvaluation"("tenderId", "evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_tenderId_key" ON "WatchlistItem"("tenderId");

-- CreateIndex
CREATE INDEX "TenderSnapshot_tenderId_capturedAt_idx" ON "TenderSnapshot"("tenderId", "capturedAt");

-- CreateIndex
CREATE INDEX "TenderChange_tenderId_detectedAt_idx" ON "TenderChange"("tenderId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCache_cacheKey_key" ON "SearchCache"("cacheKey");

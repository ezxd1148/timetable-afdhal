-- CreateTable
CREATE TABLE "meeting_request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "contactValue" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dateISO" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ipHash" TEXT,
    "personalEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meeting_request_personalEventId_fkey" FOREIGN KEY ("personalEventId") REFERENCES "personal_event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_request_personalEventId_key" ON "meeting_request"("personalEventId");

-- CreateIndex
CREATE INDEX "meeting_request_status_dateISO_idx" ON "meeting_request"("status", "dateISO");

-- CreateIndex
CREATE INDEX "meeting_request_ipHash_createdAt_idx" ON "meeting_request"("ipHash", "createdAt");

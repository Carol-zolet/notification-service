-- CreateTable
CREATE TABLE "SendHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentName" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SendHistory_unidade_createdAt_idx" ON "SendHistory"("unidade", "createdAt");

-- CreateIndex
CREATE INDEX "SendHistory_email_createdAt_idx" ON "SendHistory"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SendHistory_status_createdAt_idx" ON "SendHistory"("status", "createdAt");

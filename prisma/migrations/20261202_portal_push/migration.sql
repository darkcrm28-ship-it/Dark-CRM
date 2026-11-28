CREATE TABLE "PortalPushDevice" (
  "endpoint" TEXT PRIMARY KEY,
  "memberId" TEXT NOT NULL REFERENCES "PortalMember"("id") ON DELETE CASCADE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PortalPushDevice_nextCheck_idx" ON "PortalPushDevice"("nextCheck");
CREATE INDEX "PortalPushDevice_memberId_idx" ON "PortalPushDevice"("memberId");

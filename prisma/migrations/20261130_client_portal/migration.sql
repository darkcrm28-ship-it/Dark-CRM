CREATE TABLE "PortalMember" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "savedSearches" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "favorites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "alertsSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

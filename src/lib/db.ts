import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// In serverless / Node environments (local development or build time),
// provide ws as the WebSocket constructor for Neon serverless pool.
// On Cloudflare Workers runtime, WebSocket is natively available globally.
if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

function sanitizeDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return "postgresql://placeholder:placeholder@localhost:5432/placeholder_db";
  }
  let clean = rawUrl.trim();
  // Automatically strip accidental surrounding quotes copied from .env or dashboards
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

const connectionString = sanitizeDatabaseUrl(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool ?? new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaNeon(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

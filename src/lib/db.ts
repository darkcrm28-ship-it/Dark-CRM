import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool as PostgresPool } from "pg";
import ws from "ws";

// Always enable fetch mode for Neon Serverless queries on edge/Cloudflare runtimes.
// This executes queries over stateless HTTP fetch rather than persistent WebSockets,
// preventing hanging connections, idle socket timeouts, and Cloudflare Worker cancellations.
neonConfig.poolQueryViaFetch = true;

// Polyfill WebSocket for local Node.js environments (CLI tools, migrations) if needed
if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

function sanitizeDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return "";
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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: NeonPool | PostgresPool | undefined;
  lastDbUrl: string | undefined;
};

function getPrisma(): PrismaClient {
  const currentUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);

  // If prisma client is already initialized with this connection string, reuse it
  if (globalForPrisma.prisma && globalForPrisma.lastDbUrl === currentUrl) {
    return globalForPrisma.prisma;
  }

  if (!currentUrl) {
    console.warn("⚠️ Warning: DATABASE_URL is not set at runtime.");
  }

  const connectionString = currentUrl || "postgresql://placeholder:placeholder@localhost:5432/placeholder_db";
  const isNeon = (() => {
    try {
      return new URL(connectionString).hostname.endsWith(".neon.tech");
    } catch {
      return false;
    }
  })();

  // Neon uses its serverless adapter. A Supabase session-pooler (or local
  // PostgreSQL) URL uses the standard pg adapter for a controlled failover.
  const pool = isNeon
    ? new NeonPool({ connectionString })
    : new PostgresPool({ connectionString });
  const adapter = isNeon ? new PrismaNeon(pool as NeonPool) : new PrismaPg(pool as PostgresPool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  globalForPrisma.pool = pool;
  globalForPrisma.prisma = client;
  globalForPrisma.lastDbUrl = currentUrl;

  return client;
}

// Proxy export so that prisma is always resolved dynamically at request time
// with the active process.env.DATABASE_URL injected by Cloudflare Workers / Next.js
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrisma();
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});


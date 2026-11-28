import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface WebsiteStatement {
  bind(...values: (string | number | null)[]): WebsiteStatement;
  all<T>(): Promise<{results: T[]}>;
  first<T>(): Promise<T | null>;
  run(): Promise<{meta:{changes:number}}>;
}

export interface WebsiteDatabase {
  prepare(sql: string): WebsiteStatement;
  batch(statements: WebsiteStatement[]): Promise<unknown[]>;
}

export function websiteDb(): WebsiteDatabase | null {
  // Plain Next.js development/test servers retain their local PostgreSQL adapter.
  let env;
  try { env = getCloudflareContext().env as { WEBSITE_DB?: WebsiteDatabase }; }
  catch (error) {
    if (globalThis.navigator?.userAgent === "Cloudflare-Workers") throw error;
    return null;
  }
  if (!env.WEBSITE_DB) throw new Error("Missing website D1 binding");
  return env.WEBSITE_DB;
}

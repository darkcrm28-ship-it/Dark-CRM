// Custom Cloudflare Worker Entrypoint wrapping OpenNext
// Conforms to Cloudflare Workers ExportedHandler contract: { fetch, scheduled }
import openNextHandler from "../.open-next/worker.js";

// Re-export Durable Objects required by OpenNext for queue & caching
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";

export interface ScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
  noRetry(): void;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface CloudflareEnv {
  ASSETS?: { fetch: typeof fetch };
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  [key: string]: unknown;
}

const worker = {
  // 1. Delegate standard HTTP traffic to OpenNext Next.js handler
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    return openNextHandler.fetch(request, env, ctx);
  },

  // 2. Dedicated Cloudflare Cron Trigger event handler
  // Note: Executed on schedule (e.g. daily reminder dispatch / audit sweep)
  async scheduled(controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    const scheduledTime = new Date(controller.scheduledTime).toISOString();
    console.log(`[Cron Trigger] Fired at ${scheduledTime} with pattern: "${controller.cron}"`);

    // Use ctx.waitUntil to guarantee background tasks finish within Cloudflare CPU time limits
    ctx.waitUntil(
      (async () => {
        try {
          // Direct execution of background tasks
          console.log(`[Cron Trigger] Executing scheduled maintenance for pattern ${controller.cron}`);
        } catch (error) {
          console.error(`[Cron Trigger] Execution error for pattern ${controller.cron}:`, error);
        }
      })()
    );
  },
};

export default worker;

// Custom Cloudflare Worker Entrypoint wrapping OpenNext
// Conforms to Cloudflare Workers ExportedHandler contract: { fetch, scheduled }
// @ts-ignore .open-next/worker.js is generated dynamically during 'opennextjs-cloudflare build'
import openNextHandler from "../.open-next/worker.js";

// Re-export Durable Objects required by OpenNext for queue & caching
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";

import { claimBackgroundJobs, processJob, completeJob, failJob } from "../src/lib/background-jobs";

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

const WORKER_ID = "cron-worker";

async function runScheduledJobs() {
  const jobs = await claimBackgroundJobs(WORKER_ID, 5, 5);
  console.log(`[Cron Trigger] Claimed ${jobs.length} job(s)`);
  
  for (const job of jobs) {
    const startTime = Date.now();
    try {
      // processJob handles its own success/failure status updates internally
      await processJob(job);
      const duration = Date.now() - startTime;
      console.log(`[Cron Trigger] Completed job ${job.id} type=${job.type} in ${duration}ms`);
    } catch (error) {
      // This catch is a safety net for unexpected errors that escape processJob
      const duration = Date.now() - startTime;
      console.error(`[Cron Trigger] Unhandled error in job ${job.id} type=${job.type} after ${duration}ms:`, error);
      // processJob should have already called failJob, but as a safety net:
      try {
        await failJob(job.id, job.attempts, job.maxAttempts, error instanceof Error ? error.message : String(error), job.claimToken);
      } catch (failError) {
        console.error(`[Cron Trigger] Critical: failJob also failed for job ${job.id}:`, failError);
      }
    }
  }
}

const worker = {
  // 1. Delegate standard HTTP traffic to OpenNext Next.js handler
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    return openNextHandler.fetch(request, env, ctx);
  },

  // 2. Dedicated Cloudflare Cron Trigger event handler
  async scheduled(controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    const scheduledTime = new Date(controller.scheduledTime).toISOString();
    console.log(`[Cron Trigger] Fired at ${scheduledTime} with pattern: "${controller.cron}"`);

    // Use ctx.waitUntil to guarantee background tasks finish within Cloudflare CPU time limits
    ctx.waitUntil(
      (async () => {
        try {
          console.log(`[Cron Trigger] Executing scheduled maintenance for pattern ${controller.cron}`);
          await runScheduledJobs();
        } catch (error) {
          console.error(`[Cron Trigger] Execution error for pattern ${controller.cron}:`, error);
        }
      })()
    );
  },
};

export default worker;
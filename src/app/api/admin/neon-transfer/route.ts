import { NextResponse } from "next/server";
import { requireRole, ROLE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TRANSFER_LIMIT_BYTES = 5_000_000_000;
const WARNING_THRESHOLD_BYTES = 4_000_000_000;
const DEFAULT_NEON_PROJECT_ID = "patient-darkness-00520294";

export async function GET() {
  const session = await requireRole([ROLE.GENERAL_MANAGER]);
  if (session instanceof NextResponse) return session;

  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID || DEFAULT_NEON_PROJECT_ID;
  if (!apiKey) {
    return NextResponse.json({ code: "NEON_API_KEY_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { code: response.status === 401 || response.status === 403 ? "NEON_API_UNAUTHORIZED" : "NEON_API_UNAVAILABLE" },
        { status: 502 }
      );
    }

    const payload = await response.json() as {
      project?: {
        data_transfer_bytes?: unknown;
        consumption_period_start?: unknown;
        consumption_period_end?: unknown;
      };
    };
    const project = payload.project;
    if (!project) return NextResponse.json({ code: "NEON_USAGE_INVALID" }, { status: 502 });
    const usedBytes = project.data_transfer_bytes;

    if (typeof usedBytes !== "number" || !Number.isSafeInteger(usedBytes) || usedBytes < 0) {
      return NextResponse.json({ code: "NEON_USAGE_INVALID" }, { status: 502 });
    }

    return NextResponse.json({
      usedBytes,
      limitBytes: TRANSFER_LIMIT_BYTES,
      warningThresholdBytes: WARNING_THRESHOLD_BYTES,
      periodStart: typeof project.consumption_period_start === "string" ? project.consumption_period_start : null,
      periodEnd: typeof project.consumption_period_end === "string" ? project.consumption_period_end : null,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ code: "NEON_API_UNAVAILABLE" }, { status: 502 });
  }
}


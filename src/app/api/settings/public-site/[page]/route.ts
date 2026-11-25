import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, ROLE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidatePublicSite, parseSiteContentUpdate, readPublicSiteContent } from "@/lib/public-site";
import { isSiteContentKey } from "@/lib/public-site-types";

type RouteContext = { params: Promise<{ page: string }> };
const headers = { "Cache-Control": "private, no-store" };
const MAX_BYTES = 160 * 1024;

async function getBoundedJson(request: NextRequest): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await requireRole([ROLE.GENERAL_MANAGER]);
  if (session instanceof NextResponse) return session;
  const { page } = await params;
  if (!isSiteContentKey(page)) return NextResponse.json({ error: "الصفحة غير موجودة." }, { status: 404, headers });
  return NextResponse.json((await readPublicSiteContent())[page], { headers });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireRole([ROLE.GENERAL_MANAGER]);
  if (session instanceof NextResponse) return session;
  const { page } = await params;
  if (!isSiteContentKey(page)) return NextResponse.json({ error: "الصفحة غير موجودة." }, { status: 404, headers });
  const update = parseSiteContentUpdate(page, await getBoundedJson(request));
  if (!update) {
    return NextResponse.json({ error: "راجع طول النصوص وصيغة رقم الهاتف وروابط الخريطة والصور." }, { status: 400, headers });
  }

  const conflict = () => NextResponse.json({
    error: "فيه تعديلات أحدث على الصفحة. حمّل النسخة المنشورة وراجع تعديلاتك.",
  }, { status: 409, headers });

  const content = { overrides: update.overrides, heroImage: update.heroImage };
  try {
    const saved = await prisma.$transaction(async tx => {
      if (update.revision === 0) {
        await tx.publicSitePage.create({ data: { key: page, enabled: update.enabled, content } });
      } else {
        const result = await tx.publicSitePage.updateMany({
          where: { key: page, revision: update.revision },
          data: { enabled: update.enabled, content, revision: { increment: 1 } },
        });
        if (!result.count) return false;
      }
      await tx.auditLog.create({
        data: {
          userId: session.id, action: "UPDATE", entity: "PUBLIC_SITE_PAGE", entityId: page,
          details: JSON.stringify({ revision: update.revision + 1, enabled: update.enabled }),
        },
      });
      return true;
    }, { timeout: 12_000 });
    if (!saved) return conflict();
    await invalidatePublicSite();
    return NextResponse.json({ ...update, revision: update.revision + 1 }, { headers });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return conflict();
    console.error("Public page update failed:", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "تعذّر نشر تعديلات الصفحة. جرّب مرة أخرى." }, { status: 500, headers });
  }
}

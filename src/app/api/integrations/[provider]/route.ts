import { NextRequest, NextResponse } from "next/server";
import { requireRole, ROLE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashIdempotencyPayload } from "@/lib/idempotency";
import {
  getLinkedInLead, getWhatsAppTemplates, IntegrationError, isLinkedInLeadId,
  listLinkedInLeads, searchRecentXPosts,
} from "@/lib/provider-integrations";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ provider: string }> };
const linkedinScope = (account: string) => `linkedin-lead:${account}`;
const respond = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});

function handleError(error: unknown) {
  if (error instanceof IntegrationError) return respond({ error: error.message }, error.status);
  // Do not log upstream URLs, responses, or access tokens.
  return respond({ error: "تعذّر إكمال طلب التكامل. جرّب لاحقًا." }, 502);
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;
    const { provider } = await params;

    if (provider === "whatsapp") return respond(await getWhatsAppTemplates());
    if (provider === "twitter") {
      return respond({ posts: await searchRecentXPosts(request.nextUrl.searchParams.get("q") || "") });
    }
    if (provider !== "linkedin") return respond({ error: "التكامل غير موجود." }, 404);

    const start = Number(request.nextUrl.searchParams.get("start") || 0);
    if (!Number.isSafeInteger(start) || start < 0 || start > 100000 || start % 20 !== 0) {
      return respond({ error: "رقم الصفحة غير صالح." }, 400);
    }
    const { account, leads, more, pageSize } = await listLinkedInLeads(start);
    const seen = leads.length ? await prisma.idempotencyKey.findMany({
      where: { scope: linkedinScope(account), key: { in: leads.map((lead) => lead.id) } },
      select: { key: true },
    }) : [];
    const processed = new Set(seen.map(({ key }) => key));
    return respond({
      more, pageSize, start,
      leads: leads.map(({ id, name, submittedAt, phone }) => ({
        id, name, submittedAt, phoneLastDigits: phone.slice(-4), processed: processed.has(id),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

function phoneCandidates(phone: string): string[] {
  if (/^0\d{8,10}$/.test(phone)) {
    return [phone, `+20${phone.slice(1)}`, `0020${phone.slice(1)}`, `20${phone.slice(1)}`];
  }
  return phone.startsWith("+") ? [phone, `00${phone.slice(1)}`] : [phone];
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;
    const { provider } = await params;
    if (provider !== "linkedin") return respond({ error: "العملية غير مدعومة." }, 405);
    const origin = request.headers.get("origin");
    if (origin !== request.nextUrl.origin) return respond({ error: "مصدر الطلب غير مسموح." }, 403);

    const id = request.nextUrl.searchParams.get("id");
    if (!isLinkedInLeadId(id)) return respond({ error: "معرّف استجابة LinkedIn غير صالح." }, 400);
    // Re-read immediately before import so the browser cannot substitute
    // contact fields, form ownership or consent.
    const { account, lead } = await getLinkedInLead(id);
    const scope = linkedinScope(account);
    const result = await prisma.$transaction(async (tx) => {
      // Serialize imports for the same normalized phone, including distinct form responses.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(829002::int, hashtext(${lead.phone}))`;
      const previous = await tx.idempotencyKey.findUnique({ where: { scope_key: { scope, key: id } } });
      if (previous) return { outcome: "PROCESSED" };

      const existing = await tx.customer.findFirst({
        where: { phone: { in: phoneCandidates(lead.phone) } },
        select: { id: true },
      });
      const customer = existing ? null : await tx.customer.create({
        data: {
          name: lead.name, phone: lead.phone, email: lead.email,
          type: "LEAD", status: "NEW", source: "LinkedIn Lead Gen",
          customData: { sourceSubmittedAt: lead.submittedAt, sourceContactConsent: true },
        },
        select: { id: true },
      });
      const outcome = customer ? "IMPORTED" : "PHONE_EXISTS";
      await tx.idempotencyKey.create({
        data: {
          scope, key: id, payloadHash: hashIdempotencyPayload({ account, id }),
          entityType: customer ? "CUSTOMER" : null, entityId: customer?.id, response: { outcome },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: session.id, action: "LINKEDIN_LEAD_IMPORT", entity: customer ? "CUSTOMER" : "INTEGRATION",
          entityId: customer?.id || "LINKEDIN", details: customer ? "استيراد استجابة نموذج LinkedIn" : "تخطي استيراد رقم موجود",
        },
      });
      return { outcome };
    });
    return respond(result);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") return respond({ outcome: "PROCESSED" });
    return handleError(error);
  }
}

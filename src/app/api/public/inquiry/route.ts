import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEgyptianPhone, normalizeDate } from "@/lib/excel-normalizer";

export const dynamic = "force-dynamic";

// ─── Rate limiting (Cloudflare-safe, DB-backed) ────────────────────────────
// We avoid in-memory counters because Cloudflare Workers are stateless across
// requests. Instead we count recent inquiries for the same normalized phone in
// a transaction, which is reliable across any runtime.
const INQUIRY_RATE_WINDOW_SECONDS = 60;
const INQUIRY_RATE_MAX = 3;

// Bounded input sizes to prevent abuse / data inflation.
const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 200;
const MAX_PREFERRED_ZONE_LENGTH = 120;
const MAX_NOTES_LENGTH = 500;
const MAX_UNIT_TYPE_LENGTH = 60;
const MAX_TEXT_FIELD_LENGTH = 200;
const MAX_IMAGES = 8;
const MAX_IMAGE_LENGTH = 2000;
const MAX_BODY_BYTES = 64 * 1024;

// Advisory lock id for atomic WEB code generation.
const WEB_SEQUENCE_LOCK = 9177733;

const asText = (value: unknown, max = MAX_TEXT_FIELD_LENGTH) =>
  value === null || value === undefined ? "" : String(value).trim().slice(0, max);

const parseBoundedNumber = (value: unknown, min: number, max: number): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
};

export async function POST(request: NextRequest) {
  try {
    // ─── 0. Body size guard ───────────────────────────────────────────────
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "حجم الطلب أكبر من المسموح." }, { status: 413 });
    }

    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "صيغة الطلب غير صحيحة." }, { status: 400 });
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => undefined);
          return NextResponse.json({ error: "حجم الطلب أكبر من المسموح." }, { status: 413 });
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "صيغة الطلب غير صحيحة." }, { status: 400 });
    }
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "صيغة الطلب غير صحيحة." }, { status: 400 });
    }

    const {
      inquiryType = "CONSULTATION",
      name,
      phone,
      email,
      preferredZone,
      budget,
      notes,
      unitType,
      area,
      price,
      floor,
      bedrooms,
      bathrooms,
      images = [],
      propertyId,
      deliveryDate: rawDeliveryDate,
    } = rawBody as Record<string, any>;

    // ─── 1. Validation ────────────────────────────────────────────────────
    const nameStr = asText(name, MAX_NAME_LENGTH);
    if (nameStr.length < 2) {
      return NextResponse.json({ error: "يرجى كتابة الاسم بشكل صحيح." }, { status: 400 });
    }

    const phoneStr = asText(phone, MAX_PHONE_LENGTH);
    const phoneNorm = normalizeEgyptianPhone(phoneStr);
    if (!phoneNorm.isValid) {
      return NextResponse.json(
        { error: phoneNorm.error || "يرجى إدخال رقم هاتف صحيح للتواصل." },
        { status: 400 }
      );
    }

    const emailStr = email ? asText(email, MAX_EMAIL_LENGTH) : "";
    if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح." }, { status: 400 });
    }

    const preferredZoneStr = preferredZone ? asText(preferredZone, MAX_PREFERRED_ZONE_LENGTH) : "";
    const notesStr = notes ? asText(notes, MAX_NOTES_LENGTH) : "";
    const unitTypeStr = unitType ? asText(unitType, MAX_UNIT_TYPE_LENGTH) : "";
    const floorStr = floor !== null && floor !== undefined ? asText(floor, 20) : null;

    // area is stored as String in the schema — validate it's numeric, store as text.
    const areaNum =
      area !== null && area !== undefined && String(area).trim() !== ""
        ? parseBoundedNumber(area, 1, 100000)
        : null;
    const budgetNum = budget !== null && budget !== undefined ? parseBoundedNumber(budget, 0, 1e12) : null;
    const priceNum = price !== null && price !== undefined ? parseBoundedNumber(price, 0, 1e12) : null;
    const bedroomsNum = bedrooms ? parseBoundedNumber(bedrooms, 0, 50) : null;
    const bathroomsNum = bathrooms ? parseBoundedNumber(bathrooms, 0, 50) : null;

    // Dates: optional — if provided they must parse; invalid dates are dropped.
    const dateNorm = rawDeliveryDate ? normalizeDate(rawDeliveryDate) : null;
    const deliveryDate = dateNorm?.isValid ? dateNorm.isoDate : null;

    // Images: array of bounded strings, capped at MAX_IMAGES.
    let sanitizedImages: string[] = [];
    if (Array.isArray(images)) {
      sanitizedImages = images
        .filter((img: unknown) => typeof img === "string" && img.length > 0)
        .slice(0, MAX_IMAGES)
        .map((img: string) => img.slice(0, MAX_IMAGE_LENGTH));
    }

    // propertyId is optional — bounded UUID-ish string.
    const propertyIdStr =
      typeof propertyId === "string" && propertyId.trim().length > 0
        ? propertyId.trim().slice(0, 64)
        : null;

    const titlesMap: Record<string, string> = {
      CONSULTATION: "حجز استشارة عقارية",
      VIEWING: "طلب معاينة وحدة",
      SELL_UNIT: "طلب عرض وبيع وحدة",
      CONTACT: "استفسار وتواصل",
    };
    const typeTitle = titlesMap[String(inquiryType)] || "طلب من الموقع";
    const isSeller = inquiryType === "SELL_UNIT";

    // ─── 2. Execute in a single transaction ───────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        // Serialize the rate check and WEB code allocation in the same transaction.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WEB_SEQUENCE_LOCK}::bigint);`;
        // Rate limit: count recent inquiries for the same normalized phone in the
        // window. Counting via the Customer table (createdAt) is portable across
        // runtimes and avoids unreliable in-memory counters on Cloudflare.
        const windowStart = new Date(Date.now() - INQUIRY_RATE_WINDOW_SECONDS * 1000);
        const recentCountRes = await tx.$queryRaw<Array<{ cnt: bigint }>>`
          SELECT COUNT(*)::bigint AS cnt FROM "Customer"
          WHERE phone = ${phoneNorm.phone}
            AND "createdAt" >= ${windowStart}
        `;
        const recentCount = Number(recentCountRes[0]?.cnt ?? 0);
        if (recentCount >= INQUIRY_RATE_MAX) {
          return { __rateLimited: true as const };
        }

        // Generate WEB code atomically with an advisory lock so concurrent
        // inquiries can't produce the same count()+1 code.
        const maxSeqRes = await tx.$queryRaw<Array<{ max_seq: number | null }>>`
          SELECT MAX(
            NULLIF(REGEXP_REPLACE(code, '^WEB-0*', ''), '')::integer
          ) AS max_seq
          FROM "Customer"
          WHERE code ~ '^WEB-[0-9]+$';
        `;
        const nextSeq = (maxSeqRes[0]?.max_seq || 0) + 1;
        const code = `WEB-${String(nextSeq).padStart(4, "0")}`;

        const customer = await tx.customer.create({
          data: {
            code,
            name: nameStr,
            phone: phoneNorm.phone,
            email: emailStr || null,
            type: isSeller ? "SELLER" : "BUYER",
            status: "NEW",
            source: `الموقع الإلكتروني (${typeTitle})`,
            preferredZone: preferredZoneStr || null,
            propertyType: unitTypeStr || null,
            area: areaNum !== null ? String(areaNum) : null,
            unitSize: areaNum !== null ? areaNum : null,
            budgetMax: priceNum !== null ? priceNum : (budgetNum !== null ? budgetNum : 0),
            floor: floorStr,
            bedrooms: bedroomsNum !== null ? Math.floor(bedroomsNum) : null,
            bathrooms: bathroomsNum !== null ? Math.floor(bathroomsNum) : null,
            deliveryDate,
            // NOTE: Customer has no `notes` column. We keep notes in customData
            // AND create a proper Interaction (Interaction.notes is the canonical
            // storage) so no unknown field is sent to Prisma.
            customData: {
              inquiryType: String(inquiryType).slice(0, 40),
              propertyId: propertyIdStr,
              submittedAt: new Date().toISOString(),
              requestedAction: typeTitle,
              notes: notesStr || null,
              uploadedImages: sanitizedImages,
            } as any,
          },
        });

        // Store the inquiry text as a first-class Interaction note (canonical field).
        if (notesStr) {
          const adminUser = await tx.user.findFirst({
            where: { role: "GENERAL_MANAGER", isActive: true },
            select: { id: true },
          });
          if (adminUser) {
            await tx.interaction.create({
              data: {
                customerId: customer.id,
                userId: adminUser.id,
                type: "NOTE",
                notes: `استفسار من الموقع: ${notesStr}`,
              },
            });
          }
        }

        // Notify managers atomically with customer creation.
        const managers = await tx.user.findMany({
          where: { role: { in: ["GENERAL_MANAGER", "SALES_MANAGER"] }, isActive: true },
          select: { id: true },
        });

        const notifBody = `${typeTitle} من العميل: ${nameStr} (${phoneStr})${preferredZoneStr ? ` • المنطقة: ${preferredZoneStr}` : ""}`;
        await Promise.all(
          managers.map((m) =>
            tx.notification.create({
              data: {
                userId: m.id,
                title: `🎯 ${typeTitle} جديد من الموقع!`,
                body: notifBody,
                type: "INFO",
                link: "/dashboard/leads",
              },
            })
          )
        );

        return { customerId: customer.id, rateLimited: false as const };
      },
      { maxWait: 5000, timeout: 15000 }
    );

    if (result.__rateLimited) {
      return NextResponse.json(
        { error: "تم إرسال طلبات كثيرة مؤخراً. يرجى المحاولة بعد دقيقة." },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم استلام طلبكم بنجاح! سيتواصل معكم أحد مستشارينا المعتمدين خلال دقائق.",
      customerId: result.customerId,
    });
  } catch (error: any) {
    console.error("Public Inquiry Error:", error?.message || error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة أو التواصل المباشر عبر واتساب." },
      { status: 500 }
    );
  }
}

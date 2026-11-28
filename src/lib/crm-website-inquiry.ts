import { prisma } from "./db";
export type AcceptedInquiry = {
  inquiryType:string; nameStr:string; phoneStr:string; phone:string; emailStr:string; preferredZoneStr:string;
  notesStr:string; unitTypeStr:string; floorStr:string|null; areaNum:number|null; budgetNum:number|null;
  priceNum:number|null; bedroomsNum:number|null; bathroomsNum:number|null; deliveryDate:string|null;
  sanitizedImages:string[]; propertyIdStr:string|null; memberId:string|null; requestKey:string|null;
  typeTitle:string; isSeller:boolean;
};
const WEB_SEQUENCE_LOCK=9177733;
const INQUIRY_RATE_WINDOW_SECONDS=60;
const INQUIRY_RATE_MAX=3;
export async function deliverInquiry(input: AcceptedInquiry, websiteReference?: string) {
  const {inquiryType, nameStr, phoneStr, emailStr, preferredZoneStr, notesStr, unitTypeStr, floorStr, areaNum, budgetNum, priceNum, bedroomsNum, bathroomsNum, deliveryDate, sanitizedImages, propertyIdStr, memberId, requestKey, typeTitle, isSeller, phone} = input;
  return await prisma.$transaction(
      async (tx) => {
        // Serialize the rate check and WEB code allocation in the same transaction.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WEB_SEQUENCE_LOCK}::bigint);`;
        if (requestKey) {
          const existing = await tx.customer.findFirst({ where: { phone: phone,
            customData: { path: ["requestKey"], equals: requestKey } }, select: { id: true, code: true } });
          if (existing) return { customerId: existing.id, reference: existing.code };
        }
        if (!websiteReference && inquiryType === "VIEWING" && propertyIdStr) {
          const available = await tx.property.findFirst({ where: { id: propertyIdStr, status: "AVAILABLE",
            customData: { path: ["publicListing", "status"], equals: "APPROVED" } }, select: { id: true } });
          if (!available) return { unavailable: true };
        }
        // Rate limit: count recent inquiries for the same normalized phone in the
        // window. Counting via the Customer table (createdAt) is portable across
        // runtimes and avoids unreliable in-memory counters on Cloudflare.
        const windowStart = new Date(Date.now() - INQUIRY_RATE_WINDOW_SECONDS * 1000);
        const recentCountRes = websiteReference ? [] : await tx.$queryRaw<Array<{ cnt: bigint }>>`
          SELECT COUNT(*)::bigint AS cnt FROM "Customer"
          WHERE phone = ${phone}
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
            ...(websiteReference ? {id:websiteReference} : {}),
            code,
            name: nameStr,
            phone: phone,
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
              ...(memberId ? { portalMemberId: memberId } : {}),
              ...(requestKey ? { requestKey } : {}),
              ...(websiteReference ? { websiteReference } : {}),
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

        return { customerId: customer.id, reference: customer.code, rateLimited: false as const };
      },
      { maxWait: 5000, timeout: 15000 }
    );
}

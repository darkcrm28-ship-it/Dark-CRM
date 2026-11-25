import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, FINANCE_ROLES } from "@/lib/auth";

const ACCOUNTING_LOCK_ID = 74839210;
export async function POST() {
  try {
    const session = await requireRole(FINANCE_ROLES);
    if (session instanceof NextResponse) return session;

    const syncResult = await prisma.$transaction(
      async (tx) => {
        // حجز قفل متزامن لمنع تشغيل عمليتين متزامنتين من إنشاء معاملات مالية مكررة
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACCOUNTING_LOCK_ID}::bigint);`;

        const syncedCommissionsCount = await tx.$executeRaw`
          INSERT INTO "FinancialTransaction"
            (id, type, category, amount, "amountDecimal", description, status, "relatedId", date, "updatedAt")
          SELECT gen_random_uuid()::text, 'EXPENSE', 'COMMISSION', commission.value::double precision, commission.value,
            'عمولة موظف - ' || COALESCE(c.notes, ''), 'PENDING', c.id, c."createdAt", CURRENT_TIMESTAMP
          FROM "Commission" c
          CROSS JOIN LATERAL (SELECT COALESCE(c."amountDecimal", ROUND(c.amount::numeric, 2)) AS value) commission
          WHERE c.status = 'PENDING'
          AND commission.value > 0 AND commission.value < 10000000000000
          AND NOT EXISTS (
            SELECT 1 FROM "FinancialTransaction" f
            WHERE f.category = 'COMMISSION' AND f."relatedId" = c.id
          )
        `;
        const syncedDealsCount = await tx.$executeRaw`
          INSERT INTO "FinancialTransaction"
            (id, type, category, amount, "amountDecimal", description, status, "relatedId", date, "updatedAt")
          SELECT gen_random_uuid()::text, 'INCOME', 'REVENUE', price.value::double precision,
            price.value, 'إيراد صفقة مكتملة - القيمة المحققة', 'COMPLETED', d.id,
            COALESCE(d."closedAt", d."contractDate", d."createdAt"), CURRENT_TIMESTAMP
          FROM "Deal" d
          CROSS JOIN LATERAL (
            SELECT COALESCE(
              CASE WHEN COALESCE(d."finalPriceDecimal", d."finalPrice"::numeric) > 0
                THEN COALESCE(d."finalPriceDecimal", ROUND(d."finalPrice"::numeric, 2))
              END,
              d."valueDecimal", ROUND(d.value::numeric, 2)
            ) AS value
          ) price
          WHERE d.status IN ('CLOSED', 'COMPLETED') AND price.value > 0 AND price.value < 10000000000000
          AND NOT EXISTS (
            SELECT 1 FROM "FinancialTransaction" f
            WHERE f.category = 'REVENUE' AND f."relatedId" = d.id
          )
        `;

        if (syncedCommissionsCount > 0 || syncedDealsCount > 0) {
          await tx.auditLog.create({
            data: {
              userId: session.id,
              action: "SYNC",
              entity: "FINANCIAL_TRANSACTION",
              entityId: "ACCOUNTING_SYNC",
              details: `مزامنة الحسابات: ${syncedDealsCount} صفقة إيراد، ${syncedCommissionsCount} عمولة مصروف`,
            },
          });
        }

        return { syncedCommissionsCount, syncedDealsCount };
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    return NextResponse.json({ success: true, ...syncResult });
  } catch (error) {
    console.error("Accounting Sync Error:", error);
    return NextResponse.json({ error: "Internal server error during accounting sync" }, { status: 500 });
  }
}

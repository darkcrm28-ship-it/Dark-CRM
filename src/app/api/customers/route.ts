import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE, SALES_ROLES } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const isManager = session.role === ROLE.GENERAL_MANAGER || session.role === ROLE.SALES_MANAGER;
    const { searchParams } = request.nextUrl;

    const page = Math.min(100000, Math.max(1, parseInt(searchParams.get("page") || "", 10) || 1));
    const limit = Math.min(25, Math.max(1, parseInt(searchParams.get("limit") || "", 10) || 25));
    const view = searchParams.get("view") || "ALL";
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "";
    const project = searchParams.get("project") || "";
    const area = searchParams.get("area") || "";
    const propertyType = searchParams.get("propertyType") || "";
    const building = searchParams.get("building") || "";
    const unit = searchParams.get("unit") || "";
    const floor = searchParams.get("floor") || "";
    const staff = searchParams.get("staff") || "";
    const subType = searchParams.get("subType") || "ALL";
    const neglected = searchParams.get("neglected") === "true";

    const andConditions: any[] = [];

    // Security / Role filter
    if (!isManager) {
      andConditions.push({ assignedToId: session.id });
    } else if (staff) {
      andConditions.push({ assignedToId: staff });
    }

    // View filter
    if (view === "LEADS") {
      andConditions.push({ isArchived: false });
      andConditions.push({ status: { notIn: ["NOT_INTERESTED", "DO_NOT_SELL"] } });
      if (subType === "LEAD") {
        andConditions.push({ OR: [{ type: "LEAD" }, { status: "POTENTIAL_SELLER" }] });
      } else if (subType === "SELLER") {
        andConditions.push({ type: "SELLER" });
      } else {
        andConditions.push({ type: { in: ["SELLER", "LEAD"] } });
      }
    } else if (view === "AVAILABLE_FOR_SALE") {
      andConditions.push({ status: { in: ["WANTS_TO_SELL", "SELLER", "LANDLORD"] }, isArchived: false });
    } else if (view === "BUYERS") {
      andConditions.push({ type: "BUYER", status: { notIn: ["NOT_INTERESTED", "DO_NOT_SELL"] } });
    } else if (view === "OWNERS") {
      andConditions.push({ type: "SELLER", isArchived: false, status: { notIn: ["NOT_INTERESTED", "DO_NOT_SELL"] } });
    } else if (view === "INVENTORY") {
      andConditions.push({ status: { in: ["SELLER", "BUYER"] }, isArchived: false });
    } else if (view === "NOT_INTERESTED") {
      andConditions.push({ status: { in: ["NOT_INTERESTED", "DO_NOT_SELL"] } });
    }

    // Search query
    if (q) {
      andConditions.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { unitNumber: { contains: q } },
          { buildingNumber: { contains: q } },
          { projectName: { contains: q, mode: "insensitive" } },
          { area: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // Field filters
    if (status) andConditions.push({ status });
    if (building) andConditions.push({ buildingNumber: building });
    if (unit) andConditions.push({ unitNumber: unit });
    if (project) {
      andConditions.push({
        OR: [
          { projectId: project },
          { projectName: { contains: project, mode: "insensitive" } },
        ],
      });
    }
    if (area) andConditions.push({ area: { contains: area, mode: "insensitive" } });
    if (propertyType) andConditions.push({ propertyType });
    if (floor) andConditions.push({ floor });

    // Neglected filter
    if (neglected) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      andConditions.push({
        OR: [
          { lastInteractionAt: null },
          { lastInteractionAt: { lte: threeDaysAgo } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          interactions: {
            select: { createdAt: true, notes: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Fetch Customers Error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const data = await request.json();
    const { 
      name, phone, email, type, status, projectId, 
      area, propertyType, source, 
      installmentAmount, installmentRemaining, installmentDetails,
      governorate, city, executingCompany, deliveryDate,
      floor, bedrooms, bathrooms, finishing, preferencesSummary,
      customData, followUpDate, generalNotes, askingPrice, buildingNumber, unitSize,
      unitNumber, paperworkStatus
    } = data;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    let customer: any = null;
    const maxRetries = 3;
    const CUSTOMER_SEQUENCE_LOCK = 74839205;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        customer = await prisma.$transaction(
          async (tx) => {
            // Serialize code allocation across single-add and bulk-import via shared lock
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CUSTOMER_SEQUENCE_LOCK}::bigint);`;

            // Idempotency inside lock: same name+phone => return existing, no cross-unit merge
            const existingCustomer = await tx.customer.findFirst({
              where: { name: name.trim(), phone: phone.trim() },
            });
            if (existingCustomer) {
              return existingCustomer;
            }

            const maxCodeRes = await tx.$queryRaw<Array<{ max_seq: string | null }>>`
              SELECT COALESCE(
                MAX(NULLIF(REGEXP_REPLACE(code, '^CUST-0*', ''), '')::bigint), 0
              )::text AS max_seq
              FROM "Customer"
              WHERE code ~ '^CUST-[0-9]+$';
            `;
            const nextSeq = Number(maxCodeRes[0]?.max_seq ?? 0) + 1;
            const code = "CUST-" + nextSeq.toString().padStart(4, "0");

            const createdCustomer = await tx.customer.create({
              data: {
                code,
                name: name.trim(),
                phone: phone.trim(),
                email: email ? email.trim() : null,
                type: type || (["INTERESTED", "BUYER", "RENTER"].includes(status) ? "BUYER" : "SELLER"),
                status: status || "POTENTIAL_SELLER",
                projectId: projectId || null,
                area: area || null,
                propertyType: propertyType || null,
                source: source || null,
                installmentAmount: installmentAmount ? parseFloat(installmentAmount) : 0,
                installmentRemaining: installmentRemaining ? parseInt(installmentRemaining) : 0,
                installmentDetails: installmentDetails || null,
                governorate: governorate || null,
                city: city || null,
                executingCompany: executingCompany || null,
                deliveryDate: deliveryDate || null,
                floor: floor ? String(floor) : null,
                bedrooms: bedrooms ? parseInt(bedrooms) : null,
                bathrooms: bathrooms ? parseInt(bathrooms) : null,
                finishing: finishing || null,
                preferencesSummary: preferencesSummary || null,
                askingPrice: askingPrice ? parseFloat(askingPrice) : null,
                buildingNumber: buildingNumber ? String(buildingNumber) : null,
                unitNumber: unitNumber ? String(unitNumber) : null,
                unitSize: unitSize ? parseFloat(unitSize) : null,
                paperworkStatus: paperworkStatus || null,
                customData: (customData || {}) as any,
                assignedToId: session.role === ROLE.SALES_EMPLOYEE ? session.id : null,
              },
            });

            if (generalNotes?.trim()) {
              await tx.interaction.create({
                data: {
                  customerId: createdCustomer.id,
                  userId: session.id,
                  type: "NOTE",
                  notes: generalNotes.trim(),
                },
              });
            }

            if (status === "CALL_LATER" && followUpDate) {
              const followUp = new Date(followUpDate);
              if (!Number.isNaN(followUp.getTime())) {
                await tx.reminder.create({
                  data: {
                    customerId: createdCustomer.id,
                    userId: session.id,
                    title: "اتصال متابعة",
                    dueDate: followUp,
                    status: "PENDING",
                  },
                });
              }
            }

            await tx.auditLog.create({
              data: {
                userId: session.id,
                action: "CREATE",
                entity: "CUSTOMER",
                entityId: createdCustomer.id,
                details: `تمت إضافة العميل ${createdCustomer.name} (${code})`,
              },
            });

            return createdCustomer;
          },
          {
            maxWait: 5000,
            timeout: 10000,
          }
        );
        break;
      } catch (err: any) {
        const errTarget = Array.isArray(err?.meta?.target) ? err?.meta?.target.map(String) : [String(err?.meta?.target ?? "")];
        const isCodeConflict =
          err?.code === "P2002" &&
          (String(err?.constraint ?? "").toLowerCase().includes("code") ||
            errTarget.some((t: string) => t.toLowerCase().includes("code")));
        if (isCodeConflict && attempt < maxRetries - 1) {
          console.warn(`Customer.code conflict on single add (P2002). Retrying attempt ${attempt + 1}...`);
          await new Promise((res) => setTimeout(res, 50 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    // --- SMART ACTIVITY MATCHING ---
    const isIndustrial = propertyType?.includes("مصنع") || propertyType?.includes("صناعي");
    if (isIndustrial) {
      if (status === "POTENTIAL_SELLER" || status === "WANTS_TO_SELL") {
        // Find Buyers with same preferred activity
        const activity = (customData as any)?.factory_activity;
        if (activity) {
          const matchingBuyers = await prisma.customer.findMany({
            where: {
              status: "INTERESTED",
              customData: { path: ["preferred_factory_activity"], equals: activity }
            },
            select: { id: true, name: true, assignedToId: true }
          });

          for (const buyer of matchingBuyers) {
            if (buyer.assignedToId) {
              await (prisma as any).notification.create({
                data: {
                  userId: buyer.assignedToId,
                  title: "🎯 تطابق صناعي جديد!",
                  body: `مصنع جديد بنشاط (${activity}) قد يناسب عميلك ${buyer.name}`,
                  type: "SUCCESS",
                  link: `/dashboard/customers/${customer.id}`
                }
              });
            }
          }
        }
      } else if (status === "INTERESTED") {
        // Find Factories with same activity
        const prefActivity = (customData as any)?.preferred_factory_activity;
        if (prefActivity) {
          const matchingFactories = await prisma.customer.findMany({
            where: {
              status: { in: ["POTENTIAL_SELLER", "WANTS_TO_SELL"] },
              customData: { path: ["factory_activity"], equals: prefActivity }
            },
            take: 5
          });

          if (matchingFactories.length > 0) {
            await (prisma as any).notification.create({
              data: {
                userId: session.id,
                title: "🏭 وحدات صناعية مطابقة",
                body: `وجدنا ${matchingFactories.length} مصانع بنشاط (${prefActivity}) تناسب طلب عميلك الجديد`,
                type: "INFO",
                link: `/dashboard/customers`
              }
            });
          }
        }
      }
    }

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error("Create Customer Error:", { code: error?.code || "UNEXPECTED" });
    return NextResponse.json({ error: "تعذّر حفظ العميل. حاول مرة أخرى." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;

    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.customer.deleteMany({
        where: { id: { in: ids } },
      });

      if (deleted.count > 0) {
        await tx.auditLog.create({
          data: {
            userId: session.id,
            action: "DELETE",
            entity: "CUSTOMER",
            entityId: ids.slice(0, 5).join(", ") + (ids.length > 5 ? ` (+${ids.length - 5} more)` : ""),
            details: `حذف ${deleted.count} عميل نهائياً`,
          },
        });
      }

      return deleted;
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Delete Customers Error:", error);
    return NextResponse.json({ error: "Failed to delete customers" }, { status: 500 });
  }
}

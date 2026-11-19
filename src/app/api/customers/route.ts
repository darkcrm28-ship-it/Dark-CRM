import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isManager = session.role === "GENERAL_MANAGER" || session.role === "SALES_MANAGER";
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(25, Math.max(1, parseInt(searchParams.get("limit") || "25")));
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
        orderBy: { createdAt: "desc" },
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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const count = await prisma.customer.count();
    const code = "CUST-" + (count + 1).toString().padStart(4, "0");

     const customer = await prisma.customer.create({
      data: {
        code,
        name,
        phone,
        email,
        type: type || (["INTERESTED", "BUYER", "RENTER"].includes(status) ? "BUYER" : "SELLER"),
        status: status || "POTENTIAL_SELLER",
        projectId,
        area,
        propertyType,
        source,
        installmentAmount: installmentAmount ? parseFloat(installmentAmount) : 0,
        installmentRemaining: installmentRemaining ? parseInt(installmentRemaining) : 0,
        installmentDetails,
        governorate,
        city,
        executingCompany,
        deliveryDate,
        floor: floor ? String(floor) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        finishing,
        preferencesSummary,
        askingPrice: askingPrice ? parseFloat(askingPrice) : null,
        buildingNumber: buildingNumber ? String(buildingNumber) : null,
        unitNumber: unitNumber ? String(unitNumber) : null,
        unitSize: unitSize ? parseFloat(unitSize) : null,
        paperworkStatus,
        customData: (customData || {}) as any,
        assignedToId: session.role === "SALES_EMPLOYEE" ? session.id : null,
      },
    });

    // Create initial note if provided
    if (generalNotes?.trim()) {
      await prisma.interaction.create({
        data: {
          customerId: customer.id,
          userId: session.id,
          type: "NOTE",
          notes: generalNotes
        }
      });
    }

    // Create reminder if CALL_LATER and date provided
    if (status === "CALL_LATER" && followUpDate) {
      await prisma.reminder.create({
        data: {
          customerId: customer.id,
          userId: session.id,
          title: "اتصال متابعة",
          dueDate: new Date(followUpDate),
          status: "PENDING"
        }
      });
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
  } catch (error) {
    console.error("Create Customer Error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Only General Manager can delete customers" }, { status: 403 });
    }

    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    await prisma.customer.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete customers" }, { status: 500 });
  }
}

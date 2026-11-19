import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        interactions: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    const { 
      status, type, projectId, 
      installmentAmount, installmentRemaining, installmentDetails,
      isArchived,
      name, phone, email, area, propertyType, source,
      governorate, city, executingCompany, deliveryDate,
      floor, bedrooms, bathrooms, finishing, preferencesSummary,
      askingPrice, installmentDuration,
      unitStatus, isNegotiable, viewingTimes, paperworkStatus,
      leadScore, customData, followUpDate
    } = data;

    const oldCustomer = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!oldCustomer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auto-complete any previous pending reminders for this user & customer
    await prisma.reminder.updateMany({
      where: { customerId: params.id, userId: session.id, status: "PENDING" },
      data: { status: "COMPLETED" }
    });

    // Create reminder if CALL_LATER and date provided
    if (status === "CALL_LATER" && followUpDate) {
      await prisma.reminder.create({
        data: {
          customerId: params.id,
          userId: session.id,
          title: "اتصال متابعة",
          dueDate: new Date(followUpDate),
          status: "PENDING"
        }
      });
    }

    // Auto-update type based on status if not explicitly provided
    let finalType = type;
    if (!type) {
      if (["INTERESTED", "BUYER", "RENTER"].includes(status)) finalType = "BUYER";
      if (["WANTS_TO_SELL", "SELLER", "POTENTIAL_SELLER", "LANDLORD"].includes(status)) finalType = "SELLER";
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        status, type: finalType, projectId, name, phone, email, area, propertyType, source,
        installmentAmount: installmentAmount !== undefined ? parseFloat(installmentAmount) : undefined,
        installmentRemaining: installmentRemaining !== undefined ? parseInt(installmentRemaining) : undefined,
        installmentDetails,
        installmentDuration: installmentDuration !== undefined ? parseInt(installmentDuration) : undefined,
        askingPrice: askingPrice !== undefined ? parseFloat(askingPrice) : undefined,
        isArchived: isArchived !== undefined ? Boolean(isArchived) : undefined,
        governorate, city, executingCompany, deliveryDate,
        floor: floor !== undefined ? String(floor) : undefined,
        bedrooms: bedrooms !== undefined ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms !== undefined ? parseInt(bathrooms) : undefined,
        finishing, preferencesSummary, unitStatus,
        isNegotiable: isNegotiable !== undefined ? Boolean(isNegotiable) : undefined,
        viewingTimes, paperworkStatus,
        leadScore: leadScore !== undefined ? parseInt(leadScore) : undefined,
        customData: customData !== undefined ? (customData as any) : undefined,
      },
    });

    // Create Detailed Audit Log
    const changes: string[] = [];
    const fieldsToTrack = ["status", "askingPrice", "phone", "leadScore", "assignedToId"];
    fieldsToTrack.forEach(field => {
      const oldVal = (oldCustomer as any)[field];
      const newVal = (data as any)[field];
      if (newVal !== undefined && oldVal !== newVal) {
        changes.push(`${field}: ${oldVal} -> ${newVal}`);
      }
    });

    if (changes.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: "UPDATE",
          entity: "CUSTOMER",
          entityId: params.id,
          details: `Changed fields: ${changes.join(", ")}`
        }
      });
    }

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

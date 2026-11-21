import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCustomerAccess, requireRole, ROLE, SALES_ROLES } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireCustomerAccess(id);
    if (access instanceof NextResponse) return access;
    const customer = await prisma.customer.findFirst({
      where: access.where,
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
    return NextResponse.json(customer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Fetch Customer Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;
    const data = await request.json();
    const {
      status, type, projectId, installmentAmount, installmentRemaining, installmentDetails,
      isArchived, name, phone, email, area, propertyType, source, governorate, city,
      executingCompany, deliveryDate, floor, bedrooms, bathrooms, finishing,
      preferencesSummary, askingPrice, installmentDuration, unitStatus, isNegotiable,
      viewingTimes, paperworkStatus, leadScore, customData, followUpDate,
    } = data;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Invalid customer name" }, { status: 400 });
    }
    if (phone !== undefined && (typeof phone !== "string" || !phone.trim())) {
      return NextResponse.json({ error: "Invalid customer phone" }, { status: 400 });
    }

    const updateData = {
      status, type, projectId, name, phone, email, area, propertyType, source,
      installmentAmount: installmentAmount !== undefined ? Number(installmentAmount) : undefined,
      installmentRemaining: installmentRemaining !== undefined ? Number.parseInt(installmentRemaining, 10) : undefined,
      installmentDetails,
      installmentDuration: installmentDuration !== undefined ? Number.parseInt(installmentDuration, 10) : undefined,
      askingPrice: askingPrice !== undefined ? Number(askingPrice) : undefined,
      isArchived: isArchived !== undefined ? Boolean(isArchived) : undefined,
      governorate, city, executingCompany, deliveryDate,
      floor: floor !== undefined ? String(floor) : undefined,
      bedrooms: bedrooms !== undefined ? Number.parseInt(bedrooms, 10) : undefined,
      bathrooms: bathrooms !== undefined ? Number.parseInt(bathrooms, 10) : undefined,
      finishing, preferencesSummary, unitStatus,
      isNegotiable: isNegotiable !== undefined ? Boolean(isNegotiable) : undefined,
      viewingTimes, paperworkStatus,
      leadScore: leadScore !== undefined ? Number.parseInt(leadScore, 10) : undefined,
      customData: customData !== undefined ? customData : undefined,
    };

    const followUp = followUpDate ? new Date(followUpDate) : null;
    if (followUp && Number.isNaN(followUp.getTime())) {
      return NextResponse.json({ error: "Invalid follow-up date" }, { status: 400 });
    }

    const customer = await prisma.$transaction(async (tx) => {
      // Re-check assignment inside the same transaction as the update to avoid
      // changing a customer after their assignment has been revoked.
      const oldCustomer = await tx.customer.findFirst({
        where: session.role === ROLE.SALES_EMPLOYEE ? { id, assignedToId: session.id } : { id },
      });
      if (!oldCustomer) return null;

      if (status !== undefined) {
        await tx.reminder.updateMany({
          where: { customerId: id, userId: session.id, status: "PENDING" },
          data: { status: "COMPLETED" },
        });
      }
      if (status === "CALL_LATER" && followUp) {
        await tx.reminder.create({
          data: { customerId: id, userId: session.id, title: "اتصال متابعة", dueDate: followUp, status: "PENDING" },
        });
      }

      const updated = await tx.customer.update({ where: { id }, data: updateData });
      const changes: string[] = [];
      for (const field of ["status", "askingPrice", "phone", "leadScore"] as const) {
        const newValue = (data as Record<string, unknown>)[field];
        const oldValue = (oldCustomer as unknown as Record<string, unknown>)[field];
        if (newValue !== undefined && oldValue !== newValue) changes.push(`${field}: ${oldValue} -> ${newValue}`);
      }
      if (changes.length) {
        await tx.auditLog.create({
          data: { userId: session.id, action: "UPDATE", entity: "CUSTOMER", entityId: id, details: `Changed fields: ${changes.join(", ")}` },
        });
      }
      return updated;
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Update Customer Error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

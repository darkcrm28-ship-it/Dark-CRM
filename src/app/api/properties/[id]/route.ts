import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { requireRole, ROLE, SALES_MANAGER_ROLES } from "@/lib/auth";
import { PUBLIC_LISTING_FIELDS } from "@/lib/public-listings";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    const body = await request.json();
    if (body?.status !== "PENDING" && body?.status !== "APPROVED" && body?.status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid publication status" }, { status: 400 });
    }
    if (body.status !== "PENDING" && session.role !== ROLE.GENERAL_MANAGER) {
      return NextResponse.json({ error: "Only the General Manager can approve or reject publication" }, { status: 403 });
    }
    const fields = Array.isArray(body.fields)
      ? [...new Set(body.fields.filter((field: unknown): field is string =>
          typeof field === "string" && (PUBLIC_LISTING_FIELDS as readonly string[]).includes(field)
        ))]
      : [];
    const property = await prisma.property.findUnique({ where: { id }, select: { customData: true } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const current = property.customData && typeof property.customData === "object" && !Array.isArray(property.customData)
      ? property.customData as Record<string, unknown>
      : {};
    const updated = await prisma.$transaction(async (tx) => {
      const propertyUpdate = await tx.property.update({
        where: { id },
        data: { customData: { ...current, publicListing: { status: body.status, fields, reviewedBy: session.id, reviewedAt: new Date().toISOString() } } as Prisma.InputJsonValue },
        select: { id: true },
      });
      await tx.auditLog.create({ data: {
        userId: session.id, action: "PUBLIC_LISTING_REVIEW", entity: "PROPERTY", entityId: id,
        details: JSON.stringify({ status: body.status, fields }),
      } });
      return propertyUpdate;
    });
    return NextResponse.json({ success: true, property: updated });
  } catch (error) {
    console.error("Public listing review failed:", error);
    return NextResponse.json({ error: "Failed to update publication status" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const body = await request.json();
    const allowedFields = [
      "title", "projectName", "unitNumber", "buildingNumber", "zone", "floor",
      "size", "bedrooms", "bathrooms", "unitType", "finishing", "price",
      "status", "description", "images", "monthlyInstallment", "remainingMonths",
      "installmentType", "installmentPercentage", "customData",
    ];
    const data = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    );
    const existing = await prisma.property.findUnique({ where: { id }, select: { customData: true } });
    if (!existing) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const current = existing.customData && typeof existing.customData === "object" && !Array.isArray(existing.customData)
      ? existing.customData as Record<string, unknown>
      : {};
    const suppliedCustomData = data.customData && typeof data.customData === "object" && !Array.isArray(data.customData)
      ? data.customData as Record<string, unknown>
      : {};
    const { publicListing: _ignored, ...safeCustomData } = suppliedCustomData;
    const publication = current.publicListing && typeof current.publicListing === "object" && !Array.isArray(current.publicListing)
      ? current.publicListing as Record<string, unknown>
      : null;
    const wasApproved = publication?.status === "APPROVED";
    data.customData = {
      ...current,
      ...safeCustomData,
      ...(publication?.status === "APPROVED"
        ? { publicListing: { ...publication, status: "PENDING", reviewedBy: null, reviewedAt: null } }
        : publication ? { publicListing: publication } : {}),
    } as Prisma.InputJsonValue;
    const property = await prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({ where: { id }, data });
      if (wasApproved) {
        await tx.auditLog.create({ data: {
          userId: session.id,
          action: "PUBLIC_LISTING_INVALIDATED",
          entity: "PROPERTY",
          entityId: id,
          details: "تغيرت بيانات العقار؛ أعيدت القائمة العامة إلى انتظار المراجعة.",
        } });
      }
      return updated;
    });
    return NextResponse.json({ success: true, property });
  } catch (error) {
    console.error("Update Property Error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Property Error:", error);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }
}

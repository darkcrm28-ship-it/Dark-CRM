import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_ROLES, requireRole, ROLE, type AppRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessDocument } from "@/lib/document-access";
import {
  createDocumentSignedUrl,
  deletePrivateFile,
  privateStorageConfigured,
} from "@/lib/imagekit-private";

export const dynamic = "force-dynamic";

const ALL_ROLES = Array.from(ALLOWED_ROLES);
const PRIVILEGED_ROLES: readonly AppRole[] = [
  ROLE.GENERAL_MANAGER,
  ROLE.SALES_MANAGER,
  ROLE.ACCOUNTING_MANAGER,
];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(ALL_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const doc = await prisma.document.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        accessLevel: true,
        storageKey: true,
        url: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        title: true,
        type: true,
        createdAt: true,
        uploadedById: true,
      },
    });
    if (!doc) return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });

    const allowed = await canAccessDocument(session, {
      entityType: doc.entityType,
      entityId: doc.entityId,
      accessLevel: doc.accessLevel,
      action: "read",
    });
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!doc.url) {
      return NextResponse.json({ error: "مسار الملف غير متاح" }, { status: 409 });
    }

    const ttlParam = Number(request.nextUrl.searchParams.get("expires") || 120);
    const downloadUrl = await createDocumentSignedUrl(doc.url, ttlParam);

    if (request.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(downloadUrl, { status: 302 });
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        entityType: doc.entityType,
        entityId: doc.entityId,
        type: doc.type,
        title: doc.title,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt.toISOString(),
      },
      downloadUrl,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Signed document URL error:", error);
    return NextResponse.json({ error: "تعذّر إنشاء رابط المستند." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(ALL_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const doc = await prisma.document.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        accessLevel: true,
        storageKey: true,
        uploadedById: true,
      },
    });
    if (!doc) return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });

    const allowed = await canAccessDocument(session, {
      entityType: doc.entityType,
      entityId: doc.entityId,
      accessLevel: doc.accessLevel,
      action: "write",
    });
    const privileged = PRIVILEGED_ROLES.includes(session.role);
    if (!allowed || (!privileged && doc.uploadedById !== session.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (privateStorageConfigured()) {
      await deletePrivateFile(doc.storageKey);
    }
    await prisma.document.update({
      where: { id: doc.id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "تعذّر حذف المستند." }, { status: 500 });
  }
}

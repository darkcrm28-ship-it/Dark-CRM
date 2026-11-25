import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_ROLES, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canAccessDocument,
  isDocumentAccessLevel,
  isDocumentEntityType,
  isDocumentType,
  type DocumentAccessLevel,
} from "@/lib/document-access";
import {
  privateStorageConfigured,
  uploadPrivateFile,
  deletePrivateFile,
} from "@/lib/imagekit-private";

export const dynamic = "force-dynamic";

const ALL_ROLES = Array.from(ALLOWED_ROLES);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function serializeDocument(doc: {
  id: string;
  entityType: string;
  entityId: string;
  type: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  accessLevel: string;
  uploadedById: string;
  createdAt: Date;
}) {
  return {
    id: doc.id,
    entityType: doc.entityType,
    entityId: doc.entityId,
    type: doc.type,
    title: doc.title,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    accessLevel: doc.accessLevel,
    uploadedById: doc.uploadedById,
    createdAt: doc.createdAt.toISOString(),
  };
}

function validateMagic(bytes: Uint8Array, mime: string): boolean {
  if (mime === "application/pdf") {
    return bytes.length >= 5 &&
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(ALL_ROLES);
    if (session instanceof NextResponse) return session;

    const entityType = request.nextUrl.searchParams.get("entityType") || "";
    const entityId = request.nextUrl.searchParams.get("entityId") || "";
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType و entityId مطلوبان" }, { status: 400 });
    }
    if (!isDocumentEntityType(entityType)) {
      return NextResponse.json({ error: "نوع الكيان غير مدعوم" }, { status: 400 });
    }

    const allowed = await canAccessDocument(session, { entityType, entityId, action: "read" });
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const documents = await prisma.document.findMany({
      where: { entityType, entityId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        type: true,
        title: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        accessLevel: true,
        uploadedById: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ documents: documents.map(serializeDocument) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(ALL_ROLES);
    if (session instanceof NextResponse) return session;

    if (!privateStorageConfigured()) {
      return NextResponse.json({ error: "إعدادات تخزين المستندات غير مكتملة." }, { status: 500 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const entityType = String(form.get("entityType") || "");
    const entityId = String(form.get("entityId") || "");
    const documentType = String(form.get("type") || "OTHER");
    const titleRaw = String(form.get("title") || "").trim();
    const accessLevelRaw = String(form.get("accessLevel") || "RESTRICTED");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم اختيار ملف صحيح." }, { status: 400 });
    }
    if (!isDocumentEntityType(entityType) || !entityId) {
      return NextResponse.json({ error: "نوع الكيان أو معرّفه غير صالح" }, { status: 400 });
    }
    if (!isDocumentType(documentType)) {
      return NextResponse.json({ error: "نوع المستند غير مدعوم" }, { status: 400 });
    }
    const accessLevel: DocumentAccessLevel = isDocumentAccessLevel(accessLevelRaw)
      ? accessLevelRaw
      : "RESTRICTED";

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "حجم الملف يجب ألا يتجاوز 5 ميجابايت." }, { status: 400 });
    }
    const mime = file.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: "الصيغ المدعومة: PDF وJPG وPNG وDOCX فقط." },
        { status: 400 }
      );
    }
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!validateMagic(header, mime)) {
      return NextResponse.json({ error: "محتوى الملف لا يطابق نوعه المعلن." }, { status: 400 });
    }

    const allowed = await canAccessDocument(session, {
      entityType,
      entityId,
      accessLevel,
      action: "write",
    });
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const uploaded = await uploadPrivateFile(file, `/dark-crm/documents/${entityType.toLowerCase()}`);
    try {
      const doc = await prisma.document.create({
        data: {
          entityType,
          entityId,
          type: documentType,
          title: titleRaw || null,
          fileName: uploaded.name,
          storageKey: uploaded.fileId,
          url: uploaded.filePath,
          mimeType: mime,
          sizeBytes: uploaded.sizeBytes,
          accessLevel,
          uploadedById: session.id,
        },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          type: true,
          title: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          accessLevel: true,
          uploadedById: true,
          createdAt: true,
        },
      });
      return NextResponse.json({ document: serializeDocument(doc) }, { status: 201 });
    } catch (dbError) {
      await deletePrivateFile(uploaded.fileId).catch(() => undefined);
      throw dbError;
    }
  } catch (error) {
    console.error("Upload document error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء رفع المستند." }, { status: 500 });
  }
}

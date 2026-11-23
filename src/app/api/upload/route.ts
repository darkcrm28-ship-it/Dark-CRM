import { NextRequest, NextResponse } from "next/server";
import { requireRole, SALES_ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 500 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function validateMagicBytes(buffer: ArrayBuffer, mime: string): { ok: boolean; detected?: AllowedMimeType; error?: string } {
  const bytes = new Uint8Array(buffer.slice(0, 12));

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: mime === "image/jpeg", detected: "image/jpeg", error: "محتوى الملف ليس صورة JPEG صالحة" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ok: mime === "image/png", detected: "image/png", error: "محتوى الملف ليس صورة PNG صالحة" };
  }

  // WebP: RIFF....WEBP (bytes 0-3: "RIFF", bytes 8-11: "WEBP")
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ok: mime === "image/webp", detected: "image/webp", error: "محتوى الملف ليس صورة WebP صالحة" };
  }

  return { ok: false, error: "صيغة الملف غير مدعومة. الصيغ المسموحة: JPEG وPNG وWebP فقط." };
}

function extensionFromMime(mime: AllowedMimeType): string {
  return mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
}

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      console.error("IMAGEKIT_PRIVATE_KEY is missing");

      return NextResponse.json(
        { error: "إعدادات تخزين الصور غير مكتملة." },
        { status: 500 }
      );
    }

    const incoming = await request.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "لم يتم اختيار صورة صحيحة." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الصورة يجب ألا يتجاوز 500 كيلوبايت." },
        { status: 400 }
      );
    }

    // Magic bytes validation — read first 12 bytes
    const arrayBuffer = await file.slice(0, 12).arrayBuffer();
    const claimedMime = file.type.toLowerCase() as string;
    if (!ALLOWED_MIME_TYPES.includes(claimedMime as AllowedMimeType)) {
      return NextResponse.json(
        { error: "الصيغ المدعومة هي JPG وPNG وWebP فقط." },
        { status: 400 }
      );
    }

    const magic = validateMagicBytes(arrayBuffer, claimedMime);
    if (!magic.ok) {
      return NextResponse.json(
        { error: magic.error || "محتوى الملف لا يطابق نوعه المعلن." },
        { status: 400 }
      );
    }

    const extension = extensionFromMime(magic.detected as AllowedMimeType);

    const fileName = `property-${crypto.randomUUID()}.${extension}`;

    const uploadData = new FormData();

    uploadData.append("file", file, fileName);
    uploadData.append("fileName", fileName);
    uploadData.append("folder", "/dark-crm/properties");
    uploadData.append("useUniqueFileName", "true");

    const authorization = btoa(`${privateKey}:`);

    const response = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
        },
        body: uploadData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.url) {
      console.error("ImageKit upload failed:", {
        status: response.status,
        message: result.message,
      });

      return NextResponse.json(
        { error: "فشل تخزين الصورة على ImageKit. حاول مرة أخرى." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      fileId: result.fileId,
    });
  } catch (error) {
    console.error("Image upload error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء رفع الصورة." },
      { status: 500 }
    );
  }
}
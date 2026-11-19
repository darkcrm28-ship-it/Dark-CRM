
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 500 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لرفع الصور." },
        { status: 401 }
      );
    }

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

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "الصيغ المدعومة هي JPG وPNG وWebP فقط." },
        { status: 400 }
      );
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type.split("/")[1];

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

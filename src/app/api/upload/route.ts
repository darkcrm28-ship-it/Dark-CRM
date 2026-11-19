import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 500 * 1024; // 500 KB limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار أي ملف" }, { status: 400 });
    }

    // 1. Validate file size (Max 500 KB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `حجم الصورة (${(file.size / 1024).toFixed(0)} ك.ب) يتجاوز الحد الأقصى المسموح به وهو 500 كيلوبايت.` },
        { status: 400 }
      );
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. يرجى رفع صور بصيغة JPG أو PNG أو WebP فقط." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split("/")[1] || "jpg";
    const filename = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // 3. Cloudflare R2 Storage Integration
    const r2PublicUrl = process.env.R2_PUBLIC_DOMAIN;
    const r2AccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME || "dark-crm-images";

    if (r2AccessKey && r2SecretKey && r2AccountId && r2PublicUrl) {
      const endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/${filename}`;
      
      const r2Response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "Content-Length": buffer.length.toString(),
        },
        body: buffer,
      });

      if (r2Response.ok) {
        const publicFileUrl = `${r2PublicUrl.replace(/\/$/, "")}/${filename}`;
        return NextResponse.json({ success: true, url: publicFileUrl });
      }
    }

    // 4. Zero-Latency Cloudflare / Local Fallback:
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء رفع الصورة، يرجى المحاولة لاحقاً." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getPublicCatalogPage } from "@/lib/public-listings";
import { getPublicSiteContent } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await getPublicSiteContent()).properties.enabled) {
    return NextResponse.json({ error: "الصفحة غير متاحة." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(await getPublicCatalogPage(request.nextUrl.searchParams), {
    headers: { "Cache-Control": "no-store" },
  });
}

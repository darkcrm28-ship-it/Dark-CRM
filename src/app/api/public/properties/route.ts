import { NextRequest, NextResponse } from "next/server";
import { getPublicCatalogPage } from "@/lib/public-listings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json(await getPublicCatalogPage(request.nextUrl.searchParams), {
    headers: { "Cache-Control": "no-store" },
  });
}

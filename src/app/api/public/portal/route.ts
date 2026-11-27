import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { portalMemberId } from "@/lib/portal-member";
import { encrypt } from "@/lib/session-token";
import { hashPassword, verifyPassword } from "@/lib/auth-server";

const dummyHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new NextResponse(null, { status: 415 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const data = await request.json().catch(() => null);
  if (!data || typeof data !== "object") return new NextResponse(null, { status: 400 });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  if (data.action === "logout") { response.cookies.delete("darak-visitor"); return response; }
  if (["alerts-on", "alerts-off", "alerts-read", "favorite", "unfavorite"].includes(data.action)) {
    const id = await portalMemberId();
    if (!id) return new NextResponse(null, {status:401});
    if (data.action.startsWith("alerts-")) {
      await prisma.portalMember.updateMany({where:{id, ...(data.action === "alerts-read" ? { alertsSince: {not:null} } : {})},
        data:{alertsSince:data.action === "alerts-off" ? null : new Date()}});
      return response;
    }
    if (typeof data.propertyId !== "string" || data.propertyId.length > 64) return new NextResponse(null,{status:400});
    return prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(829007::int, hashtext(${id}))`;
      const member = await tx.portalMember.findUnique({where:{id},select:{favorites:true}});
      if (!member) return new NextResponse(null,{status:401});
      const favorites = member.favorites.filter(value => value !== data.propertyId);
      if (data.action === "favorite") {
        const published = await tx.property.findFirst({where:{id:data.propertyId,status:"AVAILABLE",
          customData:{path:["publicListing","status"],equals:"APPROVED"}},select:{id:true}});
        if (!published) return new NextResponse(null,{status:404});
        if (favorites.length >= 50) return new NextResponse(null,{status:409});
        favorites.push(published.id);
      }
      await tx.portalMember.update({where:{id},data:{favorites}});
      return response;
    });
  }
  if (data.action === "save" || data.action === "remove") {
    const id = await portalMemberId();
    if (!id) return new NextResponse(null, { status: 401 });
    if (typeof data.search !== "string" || data.search.length > 800) return new NextResponse(null, { status: 400 });
    const incoming = new URLSearchParams(data.search);
    const clean = new URLSearchParams();
    for (const field of ["q", "purpose", "budget", "type", "zone", "rooms"]) {
      const value = incoming.get(field)?.trim().slice(0,120);
      if (value) clean.set(field,value);
    }
    const query = clean.toString();
    if (!query) return new NextResponse(null,{status:400});
    return prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(829007::int, hashtext(${id}))`;
      const member = await tx.portalMember.findUnique({ where: { id }, select: { savedSearches: true } });
      if (!member) return new NextResponse(null,{status:401});
      let searches = member.savedSearches.filter(item => item !== query);
      if (data.action === "save") {
        if (searches.length >= 20) return new NextResponse(null,{status:409});
        searches = [...searches,query];
      }
      await tx.portalMember.update({ where:{id},data:{savedSearches:searches} });
      return response;
    });
  }
  if (data.action !== "login" && data.action !== "register") return new NextResponse(null,{status:400});
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof data.password !== "string" ||
      data.password.length < 10 || new TextEncoder().encode(data.password).length > 72) return new NextResponse(null,{status:400});
  const attemptKey = "portal:" + email;
  const ip = request.headers.get("cf-connecting-ip")?.slice(0,45) || "unknown";
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(829008::int, hashtext(${ip}))`;
    const since = new Date(Date.now()-600000);
    const count = await tx.loginAttempt.count({where:{createdAt:{gte:since},OR:[{email:attemptKey},{ip:"portal:"+ip}]}});
    if (count >= 20) return {status:429};
    const existing = await tx.portalMember.findUnique({where:{email}});
    let id: string | undefined;
    if (data.action === "register" && !existing) {
      // Concurrent registrations across IPs must leave the transaction usable.
      const newId = crypto.randomUUID();
      const inserted = await tx.portalMember.createMany({data:[{id:newId,email,passwordHash:await hashPassword(data.password)}],skipDuplicates:true});
      if (inserted.count) id = newId;
    } else {
      const valid = await verifyPassword(data.password,existing?.passwordHash || dummyHash);
      if (valid && existing && data.action === "login") id=existing.id;
    }
    await tx.loginAttempt.create({data:{email:attemptKey,ip:"portal:"+ip,success:!!id}});
    return {status:id ? 200 : 401,id};
  }, {isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,timeout:12000});
  if (!result.id) return new NextResponse(null,{status:result.status});
  response.cookies.set("darak-visitor",await encrypt({sub:result.id,aud:"darak-property-portal"}),{
    httpOnly:true,sameSite:"lax",secure:request.nextUrl.protocol==="https:",path:"/",maxAge:86400,
  });
  return response;
}

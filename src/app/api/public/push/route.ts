import { NextResponse } from "next/server";
import { portalMemberId } from "@/lib/portal-member";
import { isValidPushSubscription } from "@/lib/push-subscription";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!await portalMemberId()) return new Response(null,{status:401});
  const publicKey = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY) return new Response(null,{status:503});
  return NextResponse.json({publicKey},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request) {
  const id = await portalMemberId();
  if (!id) return new Response(null,{status:401});
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null,{status:415});
  const body = await request.json().catch(()=>null);
  if (!isValidPushSubscription(body?.subscription)) return new Response(null,{status:400});
  const {endpoint,keys} = body.subscription;
  if (body.action === "off") {
    await prisma.portalPushDevice.deleteMany({where:{endpoint,memberId:id}});
  } else if (body.action === "on") {
    return prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(829007::int, hashtext(${id}))`;
      const existing = await tx.portalPushDevice.findUnique({where:{endpoint},select:{memberId:true}});
      if (existing && existing.memberId !== id) return new Response(null,{status:409});
      if (!existing && await tx.portalPushDevice.count({where:{memberId:id}})>=5) return new Response(null,{status:429});
      await tx.portalPushDevice.upsert({where:{endpoint},create:{endpoint,memberId:id,p256dh:keys.p256dh,auth:keys.auth},update:{p256dh:keys.p256dh,auth:keys.auth}});
      return new Response(null,{status:204});
    });
  } else return new Response(null,{status:400});
  return new Response(null,{status:204});
}

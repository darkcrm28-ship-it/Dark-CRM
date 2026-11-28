import webpush from "web-push";
import { prisma } from "./db";
import { getPortalListings } from "./public-listings";
import { isSupportedPushEndpoint } from "./push-endpoint";

export async function deliverPortalAlerts() {
  const publicKey = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  const now = new Date();
  const devices = await prisma.portalPushDevice.findMany({where:{nextCheck:{lte:now}},orderBy:{nextCheck:"asc"},take:4,
    include:{member:{select:{savedSearches:true}}}});
  for (const device of devices) {
    const where = {endpoint:device.endpoint,memberId:device.memberId};
    const lease = new Date(now.getTime()+15*60000);
    const claimed = await prisma.portalPushDevice.updateMany({where:{...where,nextCheck:device.nextCheck},data:{nextCheck:lease}});
    if (!claimed.count) continue;
    try {
      if (!isSupportedPushEndpoint(device.endpoint)) continue;
      const [,matches] = await getPortalListings([],device.member.savedSearches,device.since);
      if (matches.length) await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}},
        JSON.stringify({title:"DARAK",body:"تحديثات جديدة في عمليات البحث المحفوظة · New saved search matches",url:"/client-portal",tag:"darak-property-matches"}),
        {TTL:3600,timeout:5000,vapidDetails:{subject:process.env.VAPID_SUBJECT || "https://darak-eg.pages.dev",publicKey,privateKey}});
      await prisma.portalPushDevice.updateMany({where:{...where,nextCheck:lease},data:{since:now}});
    } catch (error) {
      const status = (error as {statusCode?:number}).statusCode;
      if (status===404 || status===410) await prisma.portalPushDevice.deleteMany({where:{...where,nextCheck:lease}});
    }
  }
}

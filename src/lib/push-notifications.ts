import webpush from "web-push";
import { prisma } from "./db";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@dark-crm.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("Failed to configure VAPID details:", err);
    return false;
  }
}

export async function sendPushNotification(userId: string, title: string, body: string, url?: string) {
  try {
    if (!ensureVapidConfigured()) {
      console.warn("Push notification skipped: VAPID keys not configured in environment.");
      return { success: false, error: "VAPID keys not configured" };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    const notifications = subscriptions.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh,
        },
      };

      return webpush.sendNotification(
        pushConfig,
        JSON.stringify({ title, body, url })
      ).catch(async (err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        }
        console.error("Error sending push notification:", err);
      });
    });

    await Promise.all(notifications);
    return { success: true };
  } catch (error) {
    console.error("sendPushNotification error:", error);
    return { success: false, error };
  }
}

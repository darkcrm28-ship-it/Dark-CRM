import webpush from "web-push";
import { prisma } from "./db";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BK5v8TNn6qNsH6q3GWTUEkGd4MKO__lmSHfkLf4WibqtkzJFobcjGpwUraQGtLwvqqrl3TYcwI3IIZJDgsQVH4U";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "6SeXFwoMq6iQHyS6nrSkch5FrMUzbphOjKq1mizbbNI";

webpush.setVapidDetails(
  "mailto:support@darek-crm.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function sendPushNotification(userId: string, title: string, body: string, url?: string) {
  try {
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
      ).catch(async (err) => {
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

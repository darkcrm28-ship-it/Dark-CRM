"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-utils";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export default function PWAButtons() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check notification status
    if ("Notification" in window) {
      setNotifStatus(Notification.permission);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      alert("التطبيق مثبت بالفعل أو متصفحك لا يدعم هذه الخاصية حالياً.");
      return;
    }
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const handleNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("متصفحك لا يدعم الإشعارات.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifStatus(permission);

    if (permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });

        alert("✅ تم تفعيل الإشعارات بنجاح!");
      } catch (error) {
        console.error("Push subscription failed:", error);
        alert("فشل تفعيل الإشعارات. حاول مرة أخرى.");
      }
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
      {/* Install App Button */}
      {!isInstalled && (
        <button
          onClick={handleInstall}
          title="تثبيت التطبيق على الجوال"
          style={{
            width: 44, height: 44,
            borderRadius: "50%",
            background: "rgba(212, 175, 55, 0.1)",
            border: "1px solid var(--gold-primary)",
            color: "var(--gold-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "var(--gold-primary)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(212, 175, 55, 0.1)")}
        >
          📲
        </button>
      )}

      {/* Notifications Bell Button */}
      <button
        onClick={handleNotifications}
        title="تفعيل الإشعارات"
        style={{
          width: 44, height: 44,
          borderRadius: "50%",
          background: notifStatus === "granted" ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.05)",
          border: `1px solid ${notifStatus === "granted" ? "var(--accent-green)" : "var(--border-subtle)"}`,
          color: notifStatus === "granted" ? "var(--accent-green)" : "var(--text-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        {notifStatus === "granted" ? "🔔" : "🔕"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-utils";

const VAPID_PUBLIC_KEY = "BK5v8TNn6qNsH6q3GWTUEkGd4MKO__lmSHfkLf4WibqtkzJFobcjGpwUraQGtLwvqqrl3TYcwI3IIZJDgsQVH4U";

export default function PWAManager() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => console.error("[PWA] SW registration failed:", err));
    }

    // Notification permission status
    if ("Notification" in window) {
      setNotifStatus(Notification.permission);
    }

    // Listen for install prompt (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner after 3 seconds
      setTimeout(() => setShowInstallBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const requestNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    
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

        new Notification("دارك CRM 🏠", {
          body: "تم تفعيل الإشعارات بنجاح! ستتلقى تنبيهات مهمة.",
          icon: "/icons/icon-192.png",
          dir: "rtl",
        });
      } catch (error) {
        console.error("Push subscription failed:", error);
      }
    }
  };

  if (!showInstallBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 70,
        left: 12,
        right: 12,
        zIndex: 9999,
        background: "linear-gradient(135deg, #111827, #1a2235)",
        border: "1px solid rgba(212,175,55,0.3)",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.1)",
        animation: "slideUpModal 0.4s ease",
      }}
    >
      <div style={{ fontSize: 36 }}>📱</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9", marginBottom: 3 }}>
          تنصيب دارك CRM
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          أضف التطبيق لشاشتك الرئيسية للوصول السريع
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={handleInstall}
          style={{
            background: "linear-gradient(135deg, #d4af37, #a8892a)",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "Cairo, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          تنصيب ✓
        </button>
        {notifStatus === "default" && (
          <button
            onClick={requestNotifications}
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#3b82f6",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            🔔 إشعارات
          </button>
        )}
        <button
          onClick={() => setShowInstallBanner(false)}
          style={{
            background: "transparent",
            color: "#475569",
            border: "none",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "Cairo, sans-serif",
          }}
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
}

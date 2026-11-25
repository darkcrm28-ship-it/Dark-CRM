"use client";
import { useState, useEffect, useRef } from "react";
import { createClientReadCache } from "@/lib/client-read-cache";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [newPush, setNewPush] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cache] = useState(() => createClientReadCache<NotificationItem[]>(60_000, 1));
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handlePush = (event: MessageEvent) => {
      if (event.data?.type === "crm-notifications-updated") {
        cache.clear();
        setNewPush(true);
      }
    };
    navigator.serviceWorker.addEventListener("message", handlePush);
    return () => navigator.serviceWorker.removeEventListener("message", handlePush);
  }, [cache]);
  useEffect(() => () => request.current?.abort(), []);

  const toggleNotifications = async () => {
    setOpen(!open);
    if (open || request.current) return;

    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const items = await cache.load("/api/notifications", controller.signal);
      if (controller.signal.aborted) return;
      setNotifications(items);
      setNewPush(false);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const unread = notifications.filter((item) => !item.read && !item.id.startsWith("reminder-")).length;

  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) throw new Error("Notification update failed");
      cache.clear();
      setNotifications(items => items.map(item => item.id.startsWith("reminder-") ? item : { ...item, read: true }));
    } catch {
      setError(true);
    }
  };

  const TYPE_ICONS: Record<string, string> = { SUCCESS: "✅", WARNING: "⚠️", INFO: "ℹ️" };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button" aria-label="الإشعارات" aria-expanded={open} onClick={() => void toggleNotifications()}
        style={{ background: "none", cursor: "pointer", position: "relative", padding: "6px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}
      >
        🔔
        {(unread > 0 || newPush) && (
          <span style={{
            position: "absolute", top: -4, left: -4,
            background: "var(--accent-red)", color: "#fff",
            width: 18, height: 18, borderRadius: "50%",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>{unread > 9 ? "9+" : unread || "•"}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          width: 320, background: "var(--bg-card)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)", zIndex: 1000, overflow: "hidden"
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700, fontSize: 14 }}>
            الإشعارات
            {unread > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void markAllRead()}>تحديد كمقروء</button>}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {error && <p role="alert" style={{ padding: 12 }}>تعذّر تحديث الإشعارات.</p>}
            {loading && <p role="status" style={{ padding: 12 }}>جاري تحميل الإشعارات…</p>}
            {!loading && !error && notifications.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>لا توجد إشعارات</div>
            )}
            {notifications.map((n) => (
              <div key={n.id} style={{
                padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
                background: n.read ? "transparent" : "rgba(212,175,55,0.04)",
                display: "flex", gap: 10, alignItems: "flex-start"
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICONS[n.type] || "📌"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{n.body}</div>}
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString("ar-EG")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

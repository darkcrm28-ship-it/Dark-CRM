"use client";
import { useState, useEffect } from "react";

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (typeof document !== "undefined" && document.hidden) return; // Do not fetch if tab is hidden in background
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s instead of 30s

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const TYPE_ICONS: Record<string, string> = { SUCCESS: "✅", WARNING: "⚠️", INFO: "ℹ️" };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        style={{ background: "none", cursor: "pointer", position: "relative", padding: "6px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, left: -4,
            background: "var(--accent-red)", color: "#fff",
            width: 18, height: 18, borderRadius: "50%",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>{unread > 9 ? "9+" : unread}</span>
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
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>لا توجد إشعارات</div>
            ) : notifications.map((n) => (
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

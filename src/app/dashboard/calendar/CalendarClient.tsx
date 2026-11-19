"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_MAP: Record<string, { icon: string; label: string }> = {
  FOLLOW_UP: { icon: "📞", label: "متابعة" },
  VIEWING:   { icon: "🏠", label: "معاينة" },
  CALL:      { icon: "📲", label: "مكالمة" },
  MEETING:   { icon: "🤝", label: "اجتماع" },
};

export default function CalendarClient({ reminders, customers, isManager }: { reminders: any[]; customers: any[]; isManager: boolean }) {
  const [list, setList] = useState(reminders);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("FOLLOW_UP");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "done">("today");
  const router = useRouter();

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const isDone = (r: any) => r.status === "COMPLETED";

  const filtered = list.filter((r) => {
    const d = new Date(r.dueDate);
    if (filter === "today") return d >= today && d < tomorrow && !isDone(r);
    if (filter === "upcoming") return d >= tomorrow && !isDone(r);
    if (filter === "done") return isDone(r);
    return true;
  });

  const todayCount = list.filter((r) => { const d = new Date(r.dueDate); return d >= today && d < tomorrow && !isDone(r); }).length;
  const overdueCount = list.filter((r) => new Date(r.dueDate) < today && !isDone(r)).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, title, notes, dueDate, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("فشل إضافة التذكير");
      setList([...list, data.reminder]);
      setShowForm(false); setTitle(""); setNotes(""); setDueDate(""); setCustomerId(""); setType("FOLLOW_UP");
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    const newDone = currentStatus !== "COMPLETED";
    await fetch("/api/reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isDone: newDone }) });
    setList(list.map((r) => r.id === id ? { ...r, status: newDone ? "COMPLETED" : "PENDING" } : r));
  };

  const isOverdue = (r: any) => new Date(r.dueDate) < today && !isDone(r);

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">التقويم والتذكيرات</div>
          <div className="page-subtitle">
            {todayCount > 0 && <span style={{ color: "var(--gold-primary)" }}>{todayCount} مهام اليوم</span>}
            {overdueCount > 0 && <span style={{ color: "var(--accent-red)", marginRight: 8 }}>⚠️ {overdueCount} متأخرة</span>}
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? "✕ إغلاق" : "➕ تذكير جديد"}
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid-4 animate-in" style={{ marginBottom: 20 }}>
        {[
          { label: "مهام اليوم", value: todayCount, color: "var(--gold-primary)", filter: "today" as const },
          { label: "قادمة", value: list.filter((r) => new Date(r.dueDate) >= tomorrow && !isDone(r)).length, color: "var(--accent-blue)", filter: "upcoming" as const },
          { label: "متأخرة", value: overdueCount, color: "var(--accent-red)", filter: "all" as const },
          { label: "منجزة", value: list.filter((r) => isDone(r)).length, color: "var(--accent-green)", filter: "done" as const },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ cursor: "pointer" }} onClick={() => setFilter(s.filter)}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: 20, borderTop: "2px solid var(--gold-primary)" }}>
          <div style={{ fontWeight: 800, marginBottom: 14 }}>📅 إضافة تذكير / موعد</div>
          <form onSubmit={handleAdd}>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">العميل</label>
                <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">اختر عميل...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">نوع التذكير</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(TYPE_MAP).map(([v, { label, icon }]) => <option key={v} value={v}>{icon} {label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">العنوان / الموضوع</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="مثال: متابعة اهتمام العميل بالوحدة 12A" />
              </div>
              <div className="form-group">
                <label className="form-label">التاريخ والوقت</label>
                <input type="datetime-local" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">ملاحظات إضافية (اختياري)</label>
                <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ resize: "vertical" }} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "جاري الحفظ..." : "💾 حفظ التذكير"}
            </button>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "today", label: "اليوم" },
          { key: "upcoming", label: "القادمة" },
          { key: "done", label: "المنجزة" },
          { key: "all", label: "الكل" },
        ].map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key as any)} className={`btn btn-sm ${filter === t.key ? "btn-primary" : "btn-ghost"}`}>{t.label}</button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="card animate-in-2" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-text">لا توجد تذكيرات في هذه الفئة</div></div>
        ) : (
          filtered.map((r) => {
            const t = TYPE_MAP[r.type] || { icon: "📌", label: r.type };
            const overdue = isOverdue(r);
            return (
              <div key={r.id} style={{
                display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px",
                borderBottom: "1px solid var(--border-subtle)",
                background: isDone(r) ? "rgba(16,185,129,0.03)" : overdue ? "rgba(239,68,68,0.04)" : "transparent",
                opacity: isDone(r) ? 0.7 : 1,
              }}>
                <button
                  onClick={() => handleToggle(r.id, r.status)}
                  style={{
                    width: 22, height: 22, borderRadius: 4, border: "2px solid",
                    borderColor: isDone(r) ? "var(--accent-green)" : "var(--border-subtle)",
                    background: isDone(r) ? "var(--accent-green)" : "transparent",
                    cursor: "pointer", flexShrink: 0, marginTop: 2,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff"
                  }}
                >{isDone(r) ? "✓" : ""}</button>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, textDecoration: isDone(r) ? "line-through" : "none" }}>
                      {t.icon} {r.title}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={`badge ${overdue && !isDone(r) ? "badge-red" : isDone(r) ? "badge-green" : "badge-gray"}`} style={{ fontSize: 10 }}>
                        {isDone(r) ? "✓ منجز" : overdue ? "⚠️ متأخر" : new Date(r.dueDate).toLocaleString("ar-EG")}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    👤 {r.customer?.name} — {r.customer?.phone}
                    {isManager && <span style={{ marginRight: 12, color: "var(--text-muted)" }}>بواسطة: {r.user?.name}</span>}
                  </div>
                  {r.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{r.notes}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

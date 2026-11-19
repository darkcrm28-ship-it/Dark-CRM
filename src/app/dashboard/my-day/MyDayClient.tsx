"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; badge: string; priority: number }> = {
  POTENTIAL_SELLER: { label: "بائع محتمل",        badge: "badge-orange", priority: 3 },
  SELLER:           { label: "بائع",              badge: "badge-blue",   priority: 1 },
  BUYER:            { label: "مشتري",             badge: "badge-green",  priority: 1 },
  NO_ANSWER:        { label: "لا يرد",            badge: "badge-orange", priority: 2 },
  CALL_LATER:       { label: "اتصال في وقت لاحق", badge: "badge-purple", priority: 2 },
  INTERESTED:       { label: "مهتم",              badge: "badge-green",  priority: 1 },
  NOT_INTERESTED:   { label: "غير مهتم",          badge: "badge-red",    priority: 5 },
  WANTS_TO_SELL:    { label: "يرغب في البيع",     badge: "badge-blue",   priority: 1 },
  DO_NOT_SELL:      { label: "لا يرغب في البيع", badge: "badge-red",    priority: 5 },
  MEETING_SCHEDULED:{ label: "موعد معاينة",       badge: "badge-gold",   priority: 1 },
  COMPLETED:        { label: "مكتمل",             badge: "badge-green",  priority: 6 },
};

const INTERACTION_ICONS: Record<string, string> = { CALL: "📞", VIEWING: "🏠", NOTE: "📝", WHATSAPP: "💬" };

type Tab = "reminders" | "followup" | "new" | "all";

export default function MyDayClient({
  session, todayReminders, overdueReminders, myCustomers,
  needsFollowUp, todayInteractions, newCustomers, totalMyCustomers,
}: any) {
  const [activeTab, setActiveTab] = useState<Tab>("reminders");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [quickNotes, setQuickNotes] = useState<Record<string, string>>({});
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const router = useRouter();

  const todayCalls = todayInteractions.filter((i: any) => i.type === "CALL").length;
  const todayViewings = todayInteractions.filter((i: any) => i.type === "VIEWING").length;

  const handleCompleteReminder = async (id: string) => {
    setCompletingId(id);
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isDone: true }),
    });
    setCompletingId(null);
    router.refresh();
  };

  const handleQuickCall = async (customerId: string) => {
    const notes = quickNotes[customerId];
    if (!notes?.trim()) return;
    setQuickLoading(customerId);
    await fetch(`/api/customers/${customerId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CALL", notes }),
    });
    setQuickNotes((prev) => ({ ...prev, [customerId]: "" }));
    setQuickLoading(null);
    router.refresh();
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "صباح الخير" : greetingHour < 17 ? "مساء النور" : "مساء الخير";

  const tabs: { key: Tab; label: string; count: number; color?: string }[] = [
    { key: "reminders", label: "🔔 تذكيرات اليوم", count: todayReminders.length + overdueReminders.length, color: overdueReminders.length > 0 ? "var(--accent-red)" : undefined },
    { key: "followup",  label: "⚡ تحتاج متابعة",  count: needsFollowUp.length, color: needsFollowUp.length > 0 ? "var(--accent-orange)" : undefined },
    { key: "new",       label: "🆕 عملاء جدد",     count: newCustomers.length },
    { key: "all",       label: "👥 كل عملائي",     count: myCustomers.length },
  ];

  const renderCustomerCard = (customer: any, showQuickLog = true) => {
    const st = STATUS_MAP[customer.status] || { label: customer.status, badge: "badge-gray", priority: 3 };
    const lastInteraction = customer.interactions?.[0];
    const nextReminder = customer.reminders?.[0];
    const daysSinceLast = lastInteraction
      ? Math.floor((Date.now() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <div key={customer.id} style={{
        borderBottom: "1px solid var(--border-subtle)",
        padding: "14px 18px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 13, color: "#000"
              }}>{customer.name?.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{customer.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", direction: "ltr" }}>{customer.phone}</div>
              </div>
              <span className={`badge ${st.badge}`} style={{ fontSize: 10 }}>{st.label}</span>
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-secondary)", flexWrap: "wrap", paddingRight: 40 }}>
              {lastInteraction && (
                <span>{INTERACTION_ICONS[lastInteraction.type]} آخر تواصل: {daysSinceLast === 0 ? "اليوم" : `منذ ${daysSinceLast} يوم`}</span>
              )}
              {!lastInteraction && <span style={{ color: "var(--accent-orange)" }}>⚠️ لا يوجد تواصل سابق</span>}
              {nextReminder && (
                <span style={{ color: "var(--gold-primary)" }}>
                  📅 {nextReminder.title}: {new Date(nextReminder.dueDate).toLocaleDateString("ar-EG")}
                </span>
              )}
              {customer.projectName && <span>🏠 {customer.projectName}</span>}
            </div>
          </div>

          <Link href={`/dashboard/customers/${customer.id}`} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
            فتح الملف ←
          </Link>
        </div>

        {showQuickLog && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, paddingRight: 40 }}>
            <input
              className="input"
              placeholder="📝 سجّل ملاحظة المكالمة بسرعة..."
              value={quickNotes[customer.id] || ""}
              onChange={(e) => setQuickNotes((prev) => ({ ...prev, [customer.id]: e.target.value }))}
              style={{ fontSize: 12, padding: "6px 10px" }}
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickCall(customer.id); }}
            />
            <button
              onClick={() => handleQuickCall(customer.id)}
              disabled={!quickNotes[customer.id]?.trim() || quickLoading === customer.id}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              {quickLoading === customer.id ? "..." : "📞 تسجيل"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 24 }}>
        <div className="page-title">{greeting}، {session.name} 👋</div>
        <div className="page-subtitle">{new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
      </div>

      {/* Today's Stats */}
      <div className="grid-4 animate-in" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-label">إجمالي عملائي</div>
          <div className="stat-value">{totalMyCustomers}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">📞</div>
          <div className="stat-label">مكالمات اليوم</div>
          <div className="stat-value" style={{ color: "var(--accent-green)" }}>{todayCalls}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🏠</div>
          <div className="stat-label">معاينات اليوم</div>
          <div className="stat-value" style={{ color: "var(--accent-blue)" }}>{todayViewings}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⚡</div>
          <div className="stat-label">تحتاج متابعة</div>
          <div className="stat-value" style={{ color: "var(--accent-orange)" }}>{needsFollowUp.length}</div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueReminders.length > 0 && (
        <div className="alert alert-error animate-in" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>⚠️ لديك <strong>{overdueReminders.length}</strong> تذكير متأخر يحتاج اهتماماً فورياً!</span>
          <button onClick={() => setActiveTab("reminders")} className="btn btn-danger btn-sm">عرض المتأخرات</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`btn btn-sm ${activeTab === t.key ? "btn-primary" : "btn-ghost"}`}
            style={activeTab !== t.key && t.color ? { borderColor: t.color, color: t.color } : {}}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: activeTab === t.key ? "rgba(0,0,0,0.2)" : (t.color || "var(--bg-elevated)"),
                color: activeTab === t.key ? "#000" : "#fff",
                borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700, marginRight: 4
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card animate-in-2" style={{ padding: 0, overflow: "hidden" }}>

        {/* ─── REMINDERS TAB ─── */}
        {activeTab === "reminders" && (
          <div>
            {overdueReminders.length > 0 && (
              <div>
                <div style={{ padding: "10px 18px", background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.15)", fontSize: 12, fontWeight: 700, color: "var(--accent-red)" }}>
                  ⚠️ تذكيرات متأخرة ({overdueReminders.length})
                </div>
                {overdueReminders.map((r: any) => (
                  <div key={r.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(239,68,68,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>⏰ {r.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                          👤 {r.customer.name} — {r.customer.phone}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--accent-red)", marginTop: 3 }}>
                          كان من المفترض: {new Date(r.dueDate).toLocaleString("ar-EG")}
                        </div>
                        {r.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{r.notes}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Link href={`/dashboard/customers/${r.customer.id}`} className="btn btn-ghost btn-sm">فتح ←</Link>
                        <button
                          onClick={() => handleCompleteReminder(r.id)}
                          disabled={completingId === r.id}
                          className="btn btn-sm"
                          style={{ background: "var(--accent-green)", color: "#fff", opacity: completingId === r.id ? 0.6 : 1 }}
                        >
                          ✓ إنجاز
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {todayReminders.length > 0 && (
              <div>
                <div style={{ padding: "10px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", fontSize: 12, fontWeight: 700, color: "var(--gold-primary)" }}>
                  📅 مواعيد اليوم ({todayReminders.length})
                </div>
                {todayReminders.map((r: any) => (
                  <div key={r.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {r.type === "VIEWING" ? "🏠" : r.type === "CALL" ? "📞" : "📋"} {r.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                          👤 {r.customer.name} — <span style={{ direction: "ltr", display: "inline-block" }}>{r.customer.phone}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gold-primary)", marginTop: 3 }}>
                          🕐 {new Date(r.dueDate).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {r.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{r.notes}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Link href={`/dashboard/customers/${r.customer.id}`} className="btn btn-ghost btn-sm">فتح ←</Link>
                        <button
                          onClick={() => handleCompleteReminder(r.id)}
                          disabled={completingId === r.id}
                          className="btn btn-sm"
                          style={{ background: "var(--accent-green)", color: "#fff" }}
                        >
                          ✓ إنجاز
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!todayReminders.length && !overdueReminders.length && (
              <div className="empty-state" style={{ padding: 60 }}>
                <div className="empty-state-icon">🎉</div>
                <div className="empty-state-text">لا توجد تذكيرات اليوم. أنت منجز!</div>
              </div>
            )}
          </div>
        )}

        {/* ─── NEEDS FOLLOW-UP TAB ─── */}
        {activeTab === "followup" && (
          <div>
            <div style={{ padding: "10px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", fontSize: 12, fontWeight: 700, color: "var(--accent-orange)" }}>
              ⚡ عملاء لم يتم التواصل معهم منذ 3 أيام أو أكثر ({needsFollowUp.length})
            </div>
            {needsFollowUp.length === 0 ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">رائع! جميع عملاءك تم متابعتهم في آخر 3 أيام.</div>
              </div>
            ) : (
              needsFollowUp.map((c: any) => renderCustomerCard(c, true))
            )}
          </div>
        )}

        {/* ─── NEW CUSTOMERS TAB ─── */}
        {activeTab === "new" && (
          <div>
            <div style={{ padding: "10px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", fontSize: 12, fontWeight: 700, color: "var(--accent-blue)" }}>
              🆕 عملاء تم تعيينهم لك في آخر 3 أيام ({newCustomers.length})
            </div>
            {newCustomers.length === 0 ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">لا يوجد عملاء جدد في آخر 3 أيام.</div>
              </div>
            ) : (
              newCustomers.map((c: any) => (
                <div key={c.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 13, color: "#000"
                    }}>{c.name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.phone} · تم التعيين: {new Date(c.createdAt).toLocaleDateString("ar-EG")}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge ${STATUS_MAP[c.status]?.badge || "badge-gray"}`} style={{ fontSize: 10 }}>{STATUS_MAP[c.status]?.label || c.status}</span>
                    <Link href={`/dashboard/customers/${c.id}`} className="btn btn-ghost btn-sm">فتح ←</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── ALL CUSTOMERS TAB ─── */}
        {activeTab === "all" && (
          <div>
            <div style={{ padding: "10px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", fontSize: 12, fontWeight: 700 }}>
              آخر 20 عميل من قائمتي
            </div>
            {myCustomers.length === 0 ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-text">لم يتم تعيين أي عملاء لك بعد.</div>
              </div>
            ) : (
              myCustomers.map((c: any) => renderCustomerCard(c, true))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

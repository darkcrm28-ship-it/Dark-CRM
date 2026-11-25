"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: "💵 مرتبات",
  RENT: "🏠 إيجارات",
  COMMISSION: "💰 عمولات",
  REVENUE: "📈 إيرادات صفقات",
  OTHER_EXPENSE: "📑 مصروفات عامة",
};

const TYPE_LABELS: Record<string, string> = {
  INCOME: "وارد (دخل)",
  EXPENSE: "صادر (مصروف)",
};

export default function AccountingClient({ initialTransactions, initialStats }: any) {
  const list = initialTransactions;
  const stats = initialStats;
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "EXPENSE",
    category: "OTHER_EXPENSE",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      router.refresh();
    } catch {
      alert("فشل المزامنة");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || "فشل الإضافة");
      }
      setShowForm(false);
      setForm({ type: "EXPENSE", category: "OTHER_EXPENSE", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "فشل الإضافة");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!confirm("هل تريد تأكيد عملية الصرف/التحصيل؟")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/accounting", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error("Confirmation failed");
      router.refresh();
    } catch {
      alert("فشل التأكيد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">النظام المحاسبي (الخزينة)</h1>
          <p className="page-subtitle">الإجماليات لكل الفترات، والجدول يعرض آخر 100 حركة مالية.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSync} className="btn btn-secondary" disabled={loading}>
            🔄 استيراد العمولات والصفقات
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? "✕ إغلاق" : "+ إضافة حركة مالية"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3 animate-in-1" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-label">إجمالي الإيرادات المحصلة</div>
          <div className="stat-value" style={{ color: "var(--accent-green)" }}>
            {stats.income.toLocaleString()} <span style={{ fontSize: 14 }}>ج.م</span>
          </div>
          <div className="stat-sub">صافي الصفقات والواردات</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">💸</div>
          <div className="stat-label">إجمالي المصروفات المدفوعة</div>
          <div className="stat-value" style={{ color: "var(--accent-orange)" }}>
            {stats.expense.toLocaleString()} <span style={{ fontSize: 14 }}>ج.م</span>
          </div>
          <div className="stat-sub">مرتبات، إيجارات، وعمولات</div>
        </div>
        <div className="stat-card" style={{ background: "var(--bg-elevated)", border: "1px solid var(--gold-primary)" }}>
          <div className="stat-icon">⚖️</div>
          <div className="stat-label">صافي الربح (الخزينة)</div>
          <div className="stat-value" style={{ color: "var(--gold-primary)" }}>
            {(stats.income - stats.expense).toLocaleString()} <span style={{ fontSize: 14 }}>ج.م</span>
          </div>
          <div className="stat-sub">السيولة المتاحة حالياً</div>
        </div>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSubmit} className="grid-3">
            <div className="form-group">
              <label className="form-label">نوع الحركة</label>
              <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="EXPENSE">صادر (مصروف)</option>
                <option value="INCOME">وارد (دخل)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">التصنيف</label>
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="SALARY">مرتبات</option>
                <option value="RENT">إيجارات</option>
                <option value="OTHER_EXPENSE">مصروفات عامة</option>
                <option value="REVENUE">إيرادات أخرى</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المبلغ</label>
              <input className="input" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required placeholder="0.00" />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">الوصف / التفاصيل</label>
              <input className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="مثال: إيجار شهر مايو - فرع الرئيسي" />
            </div>
            <div className="form-group">
              <label className="form-label">التاريخ</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div style={{ gridColumn: "span 3", textAlign: "left", marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>حفظ الحركة المالية</button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Table */}
      <div className="card animate-in-2" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>التصنيف</th>
                <th>الوصف</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t: any) => (
                <tr key={t.id} style={{ opacity: t.status === "PENDING" ? 0.8 : 1 }}>
                  <td>{new Date(t.date).toLocaleDateString("ar-EG")}</td>
                  <td style={{ fontWeight: 700 }}>{CATEGORY_LABELS[t.category]}</td>
                  <td style={{ fontSize: 12 }}>{t.description}</td>
                  <td>
                    <span className={`badge ${t.type === "INCOME" ? "badge-green" : "badge-red"}`}>
                      {TYPE_LABELS[t.type]}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800 }}>{t.amount.toLocaleString()} ج.م</td>
                  <td>
                    <span className={`badge ${t.status === "COMPLETED" ? "badge-gold" : "badge-gray"}`}>
                      {t.status === "COMPLETED" ? "تم التحصيل/الصرف" : "معلق (بانتظار التأكيد)"}
                    </span>
                  </td>
                  <td>
                    {t.status === "PENDING" && (
                      <button onClick={() => handleConfirm(t.id)} className="btn btn-primary btn-sm">
                        ✅ تأكيد الصرف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">لا توجد حركات مالية مسجلة</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

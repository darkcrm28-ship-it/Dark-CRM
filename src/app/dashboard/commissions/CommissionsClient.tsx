"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommissionsClient({ employees }: { employees: any[] }) {
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, amount: parseFloat(amount), description }),
      });
      if (!res.ok) throw new Error("فشل إضافة العمولة");
      setAmount(""); setDescription("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const totalAll = employees.reduce((acc, emp) => acc + emp.commissions.reduce((a: number, c: any) => a + c.amount, 0), 0);

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">العمولات والمكافآت</div>
          <div className="page-subtitle">إجمالي العمولات: <strong style={{ color: "var(--accent-green)" }}>{totalAll.toLocaleString()} جنيه</strong></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Employees List */}
        <div className="card animate-in" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700 }}>👥 الموظفون</div>
          {employees.map((emp) => {
            const total = emp.commissions.reduce((a: number, c: any) => a + c.amount, 0);
            return (
              <div
                key={emp.id}
                onClick={() => setSelected(emp)}
                style={{
                  padding: "12px 16px", cursor: "pointer", transition: "background var(--transition)",
                  borderBottom: "1px solid var(--border-subtle)",
                  background: selected?.id === emp.id ? "rgba(212,175,55,0.08)" : "transparent",
                  borderLeft: selected?.id === emp.id ? "3px solid var(--gold-primary)" : "3px solid transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.commissions.length} عمولة</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-green)" }}>
                    {total.toLocaleString()} <span style={{ fontSize: 10 }}>جنيه</span>
                  </div>
                </div>
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>👤</div>
              <div className="empty-state-text">لا يوجد موظفين مبيعات</div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-in">
            {/* Add Commission */}
            <div className="card" style={{ borderTop: "2px solid var(--accent-green)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                💰 إضافة عمولة لـ <span style={{ color: "var(--gold-primary)" }}>{selected.name}</span>
              </div>
              {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
              <form onSubmit={handleAddCommission}>
                <div className="grid-2" style={{ marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">المبلغ (جنيه)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input" placeholder="مثال: 5000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">البيان</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required className="input" placeholder="عمولة بيع وحدة 12A..." />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ background: "linear-gradient(135deg, var(--accent-green), #059669)" }}>
                  {loading ? "جاري الحفظ..." : "✅ إضافة العمولة"}
                </button>
              </form>
            </div>

            {/* Commissions History */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>📊 سجل العمولات</span>
                <span style={{ fontWeight: 700, color: "var(--accent-green)" }}>
                  الإجمالي: {selected.commissions.reduce((a: number, c: any) => a + c.amount, 0).toLocaleString()} جنيه
                </span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>البيان</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{new Date(c.date).toLocaleDateString("ar-EG")}</td>
                      <td><span style={{ fontWeight: 700, color: "var(--accent-green)" }}>+{c.amount.toLocaleString()} جنيه</span></td>
                      <td>{c.description}</td>
                    </tr>
                  ))}
                  {selected.commissions.length === 0 && (
                    <tr><td colSpan={3}><div className="empty-state" style={{ padding: 24 }}>لا توجد عمولات مسجلة</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div className="empty-state">
              <div className="empty-state-icon">👈</div>
              <div className="empty-state-text">اختر موظفاً من القائمة لعرض وإضافة عمولاته</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

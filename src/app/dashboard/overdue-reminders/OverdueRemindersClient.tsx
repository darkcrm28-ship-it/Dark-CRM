"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OverdueRemindersClient({ reminders, isManager }: { reminders: any[], isManager: boolean }) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [newDate, setNewDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes || !newDate) return;
    setLoading(true);

    try {
      // Create interaction and a new reminder
      // The API is already updated to auto-complete previous PENDING reminders
      await fetch(`/api/customers/${selectedCustomer.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "CALL", 
          notes, 
          reminderDate: newDate,
          reminderTitle: "متابعة مؤجلة"
        }),
      });
      
      // Update the customer status to CALL_LATER to be safe
      await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CALL_LATER", followUpDate: newDate }),
      });

      setSelectedCustomer(null);
      setNotes("");
      setNewDate("");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">⚠️ مهام المتابعة المتأخرة</div>
          <div className="page-subtitle">العملاء الذين فات موعد التواصل المحدد معهم</div>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-text">ممتاز! ليس لديك أي مواعيد متابعة متأخرة.</div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table desktop-table">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم التليفون</th>
                <th>عنوان المتابعة</th>
                <th>موعد المتابعة الفائت</th>
                {isManager && <th>الموظف المسؤول</th>}
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((r: any) => {
                const daysLate = Math.floor((Date.now() - new Date(r.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={r.id} className="row-danger">
                    <td style={{ fontWeight: 800 }}>
                      <Link href={`/dashboard/customers/${r.customer.id}`} style={{ color: "var(--gold-primary)" }}>
                        {r.customer.name}
                      </Link>
                    </td>
                    <td style={{ direction: "ltr" }}>{r.customer.phone}</td>
                    <td>{r.title}</td>
                    <td style={{ color: "var(--accent-red)", fontWeight: 700 }}>
                      منذ {daysLate} أيام ({new Date(r.dueDate).toLocaleDateString("ar-EG")})
                    </td>
                    {isManager && <td>{r.user.name}</td>}
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/dashboard/customers/${r.customer.id}`} className="btn btn-sm btn-secondary">
                          عرض الملف
                        </Link>
                        <button 
                          onClick={() => setSelectedCustomer(r.customer)}
                          className="btn btn-sm btn-primary"
                        >
                          تسجيل تواصل وموعد جديد
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تسجيل متابعة مع: {selectedCustomer.name}</h3>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-ghost">✕</button>
            </div>
            <form onSubmit={handleComplete} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">ملاحظات التواصل (ماذا حدث؟)</label>
                <textarea 
                  required
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="input" 
                  rows={4}
                  placeholder="مثال: تم الاتصال ولم يرد، أو طلب التواصل غداً..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">تحديد الموعد الجديد (مطلوب)</label>
                <input 
                  required
                  type="datetime-local" 
                  value={newDate} 
                  onChange={e => setNewDate(e.target.value)} 
                  className="input" 
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 10 }}>
                {loading ? "جاري الحفظ..." : "حفظ وإنهاء المهمة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

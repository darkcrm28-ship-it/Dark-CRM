"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "GENERAL_MANAGER",   label: "مدير عام",              badge: "badge-gold" },
  { value: "SALES_MANAGER",     label: "مدير مبيعات",           badge: "badge-blue" },
  { value: "SALES_EMPLOYEE",    label: "موظف مبيعات",           badge: "badge-green" },
  { value: "HR_MANAGER",        label: "مدير موارد بشرية",     badge: "badge-orange" },
  { value: "ACCOUNTING_MANAGER",label: "مدير حسابات",           badge: "badge-gray" },
];

export default function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALES_EMPLOYEE");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [address, setAddress] = useState("");
  const [dateJoined, setDateJoined] = useState("");
  const [salaryBase, setSalaryBase] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const router = useRouter();

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); 
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, email, password, role, 
          phone, nationalId, address, 
          dateJoined: dateJoined ? new Date(dateJoined) : null,
          salaryBase: salaryBase ? parseFloat(salaryBase) : 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");
      setUsers([data.user, ...users]);
      setShowForm(false);
      setName(""); setEmail(""); setPassword(""); setRole("SALES_EMPLOYEE");
      setPhone(""); setNationalId(""); setAddress(""); setDateJoined(""); setSalaryBase("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      } finally { 
        setLoading(false); 
      }
    };
  
    const handleEditClick = (user: any) => {
      setEditingUser(user);
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setPhone(user.phone || "");
      setNationalId(user.nationalId || "");
      setAddress(user.address || "");
      setDateJoined(user.dateJoined ? new Date(user.dateJoined).toISOString().split('T')[0] : "");
      setSalaryBase(user.salaryBase ? String(user.salaryBase) : "");
      setNewPassword(""); // Reset password field
    };
  
    const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setLoading(true); setError("");
      try {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name, email, role, phone, nationalId, address,
            dateJoined: dateJoined ? new Date(dateJoined) : null,
            salaryBase: salaryBase ? parseFloat(salaryBase) : 0,
            isActive: editingUser.isActive,
            password: newPassword || undefined
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "حدث خطأ أثناء التحديث");
        
        setUsers(users.map((u: any) => u.id === editingUser.id ? { ...u, ...data.user } : u));
        setEditingUser(null);
        setName(""); setEmail(""); setPassword(""); setRole("SALES_EMPLOYEE");
        setPhone(""); setNationalId(""); setAddress(""); setDateJoined(""); setSalaryBase("");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    const toggleUserStatus = async (user: any) => {
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...user, isActive: !user.isActive }),
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(users.map((u: any) => u.id === user.id ? { ...u, isActive: data.user.isActive } : u));
          router.refresh();
        }
      } catch (err) {
        console.error(err);
      }
    };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">المستخدمين والصلاحيات</div>
          <div className="page-subtitle">{users.length} مستخدم مسجل</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? "✕ إغلاق" : "+ إضافة مستخدم جديد"}
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="card animate-in" style={{ marginBottom: 20, borderTop: "2px solid var(--gold-primary)" }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🆕 بيانات المستخدم الجديد</div>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleAddUser}>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="أحمد محمد" />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="ahmed@dark.com" />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">الصلاحية / الدور</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid-2" style={{ marginBottom: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="01xxxxxxxxx" />
              </div>
              <div className="form-group">
                <label className="form-label">الرقم القومي</label>
                <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="input" placeholder="290xxxxxxxxxxx" />
              </div>
              <div className="form-group">
                <label className="form-label">العنوان</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="القاهرة، مصر" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">تاريخ التعيين</label>
                  <input type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">الراتب الأساسي</label>
                  <input type="number" value={salaryBase} onChange={(e) => setSalaryBase(e.target.value)} className="input" placeholder="5000" />
                </div>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "جاري الحفظ..." : "💾 حفظ المستخدم"}
            </button>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ fontWeight: 800 }}>✏️ تعديل بيانات المستخدم: {editingUser.name}</div>
              <button onClick={() => setEditingUser(null)} className="btn-close">✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ margin: "16px 20px 0" }}>{error}</div>}
            <form onSubmit={handleUpdateUser} style={{ padding: 20 }}>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">الصلاحية / الدور</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">كلمة مرور جديدة (اختياري)</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="اتركه فارغاً للحفاظ على الحالية" />
                </div>
              </div>
              
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">الرقم القومي</label>
                  <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">العنوان</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ التعيين</label>
                  <input type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">الراتب الأساسي</label>
                  <input type="number" value={salaryBase} onChange={(e) => setSalaryBase(e.target.value)} className="input" />
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">مناطق الخبرة (افصل بينها بفاصلة ,)</label>
                <input 
                  className="input" placeholder="مثال: التجمع الخامس، مدينة نصر، الشيخ زايد"
                  value={editingUser.expertAreas || ""} 
                  onChange={(e) => setEditingUser({ ...editingUser, expertAreas: e.target.value })} 
                />
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-ghost">إلغاء</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid-3 animate-in-1">
        {users.map((user) => {
          const roleInfo = ROLES.find((r) => r.value === user.role);
          return (
            <div key={user.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 18, color: "#000", flexShrink: 0
                }}>{user.name?.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.name} {user.isActive === false && <span style={{ color: "var(--accent-red)", fontSize: 12 }}>(موقوف)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{user.email}</div>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${roleInfo?.badge || "badge-gray"}`}>{roleInfo?.label || user.role}</span>
              </div>

              {(user.phone || user.nationalId || (user.salaryBase && user.salaryBase > 0)) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {user.phone && <div style={{ color: "var(--text-secondary)" }}>📞 {user.phone}</div>}
                  {user.nationalId && <div style={{ color: "var(--text-secondary)" }}>🆔 {user.nationalId}</div>}
                  {user.salaryBase > 0 && <div style={{ color: "var(--accent-green)", fontWeight: 700 }}>💰 الراتب: {user.salaryBase?.toLocaleString()} جنيه</div>}
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
                <a href={`/dashboard/users/${user.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: "center" }}>ملف الأداء 📊</a>
                <button onClick={() => handleEditClick(user)} className="btn btn-secondary btn-sm">تعديل ✏️</button>
                <button onClick={() => toggleUserStatus(user)} className="btn btn-ghost btn-sm" title={user.isActive ? "إيقاف الحساب" : "تنشيط الحساب"}>
                  {user.isActive ? "🔴" : "🟢"}
                </button>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">لا يوجد مستخدمين. قم بإضافة الفريق أولاً.</div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileClient({ initialUser }: { initialUser: any }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("كلمات المرور الجديدة غير متطابقة");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ أثناء التحديث");

      setSuccess("تم تحديث الملف الشخصي بنجاح! ✨");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUser((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="grid-2-1" style={{ gap: 24 }}>
      <div className="card animate-in-1">
        <form onSubmit={handleUpdateProfile}>
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>📂 البيانات الأساسية والشخصية</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>يرجى إكمال كافة الحقول لضمان صحة بيانات الموظف</p>
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">الاسم الكامل</label>
              <input type="text" name="name" value={user.name || ""} readOnly className="input" style={{ opacity: 0.7, cursor: "not-allowed" }} />
              <small style={{ color: "var(--text-muted)" }}>يتم تعديله بواسطة المدير فقط</small>
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" name="email" value={user.email || ""} readOnly className="input" style={{ opacity: 0.7, cursor: "not-allowed" }} />
            </div>
            <div className="form-group">
              <label className="form-label">رقم الهاتف</label>
              <input type="text" name="phone" value={user.phone || ""} onChange={handleChange} className="input" placeholder="01xxxxxxxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">الرقم القومي</label>
              <input type="text" name="nationalId" value={user.nationalId || ""} onChange={handleChange} className="input" placeholder="290xxxxxxxxxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">تاريخ الميلاد</label>
              <input type="date" name="birthDate" value={user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : ""} onChange={handleChange} className="input" />
            </div>
            <div className="form-group">
              <label className="form-label">العنوان الحالي</label>
              <input type="text" name="address" value={user.address || ""} onChange={handleChange} className="input" placeholder="القاهرة، مصر" />
            </div>
          </div>

          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)", marginTop: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>🚨 بيانات الطوارئ</h3>
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">اسم جهة الاتصال في الطوارئ</label>
              <input type="text" name="emergencyContactName" value={user.emergencyContactName || ""} onChange={handleChange} className="input" placeholder="الاسم ثلاثي" />
            </div>
            <div className="form-group">
              <label className="form-label">رقم هاتف الطوارئ</label>
              <input type="text" name="emergencyContactPhone" value={user.emergencyContactPhone || ""} onChange={handleChange} className="input" placeholder="01xxxxxxxxx" />
            </div>
          </div>

          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)", marginTop: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>🎓 المؤهلات والخبرات</h3>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">المؤهل الدراسي</label>
            <input type="text" name="qualification" value={user.qualification || ""} onChange={handleChange} className="input" placeholder="مثال: بكالوريوس تجارة - جامعة القاهرة" />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">الخبرات السابقة</label>
            <textarea name="experience" value={user.experience || ""} onChange={handleChange} className="input" style={{ minHeight: 100 }} placeholder="ذكر الشركات السابقة وسنوات الخبرة..."></textarea>
          </div>

          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)", marginTop: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>💳 البيانات المالية</h3>
          </div>

          <div className="form-group" style={{ marginBottom: 32 }}>
            <label className="form-label">تفاصيل الحساب البنكي (أو طريقة القبض)</label>
            <input type="text" name="bankAccountDetails" value={user.bankAccountDetails || ""} onChange={handleChange} className="input" placeholder="رقم الحساب أو المحفظة الإلكترونية" />
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "12px" }}>
            {loading ? "جاري الحفظ..." : "💾 حفظ كافة البيانات"}
          </button>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="card animate-in-2" style={{ borderTop: "4px solid var(--gold-primary)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🔑 تغيير كلمة المرور</h3>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">كلمة المرور الحالية</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">كلمة المرور الجديدة</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">تأكيد كلمة المرور</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>* لتغيير كلمة المرور، يجب ملء الحقول أعلاه ثم الضغط على "حفظ كافة البيانات" بالأسفل أو توفير كلمة المرور الحالية.</p>
        </div>

        <div className="card animate-in-3" style={{ background: "var(--bg-elevated)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📊 حالة الملف</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ 
              width: 12, height: 12, borderRadius: "50%", 
              background: user.profileCompleted ? "var(--accent-green)" : "var(--accent-red)" 
            }}></div>
            <span style={{ fontWeight: 700, color: user.profileCompleted ? "var(--accent-green)" : "var(--accent-red)" }}>
              {user.profileCompleted ? "مكتمل" : "غير مكتمل"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {user.profileCompleted 
              ? "شكراً لك! لقد قمت بإكمال ملفك الوظيفي بنجاح." 
              : "برجاء إكمال كافة البيانات المطلوبة في النموذج الجانبي لتحديث ملفك الوظيفي في النظام."}
          </div>
        </div>
      </div>
    </div>
  );
}

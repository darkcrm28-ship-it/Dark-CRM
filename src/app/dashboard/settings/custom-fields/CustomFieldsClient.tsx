"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomFieldsClient() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newField, setNewField] = useState({
    entityType: "CUSTOMER",
    label: "",
    name: "",
    fieldType: "TEXT",
    options: ""
  });

  const fetchFields = async () => {
    setLoading(true);
    const res = await fetch("/api/settings/custom-fields");
    const data = await res.json();
    setFields(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/settings/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newField)
    });
    if (res.ok) {
      setNewField({ entityType: "CUSTOMER", label: "", name: "", fieldType: "TEXT", options: "" });
      fetchFields();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحقل؟")) return;
    const res = await fetch("/api/settings/custom-fields", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (res.ok) fetchFields();
  };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900 }}>⚙️ إعدادات الحقول الديناميكية</h2>
      </div>

      <div className="grid-2-1" style={{ gap: 24, alignItems: "start" }}>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>📋 الحقول الحالية</h3>
          {loading ? <p>جاري التحميل...</p> : (
            <table className="table">
              <thead>
                <tr>
                  <th>الاسم (بالعربي)</th>
                  <th>الاسم البرمجي</th>
                  <th>النوع</th>
                  <th>يخص</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center" }}>لا يوجد حقول مضافة بعد</td></tr> : 
                fields.map((f: any) => (
                  <tr key={f.id}>
                    <td>{f.label}</td>
                    <td><code>{f.name}</code></td>
                    <td>{f.fieldType}</td>
                    <td>{f.entityType === "CUSTOMER" ? "عملاء" : "عقارات"}</td>
                    <td>
                      <button onClick={() => handleDelete(f.id)} className="btn btn-sm btn-ghost" style={{ color: "var(--accent-red)" }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ borderTop: "4px solid var(--gold-primary)" }}>
          <h3 style={{ marginBottom: 20 }}>➕ إضافة حقل جديد</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">يخص الكيان</label>
              <select className="input" value={newField.entityType} onChange={e => setNewField({...newField, entityType: e.target.value})}>
                <option value="CUSTOMER">عملاء</option>
                <option value="PROPERTY">عقارات</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">الاسم المعروض (بالعربي)</label>
              <input 
                className="input" placeholder="مثال: الجنسية" required
                value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">الاسم البرمجي (بالإنجليزي - بدون مسافات)</label>
              <input 
                className="input" placeholder="مثال: nationality" required
                value={newField.name} onChange={e => setNewField({...newField, name: e.target.value.toLowerCase().replace(/\s/g, "_")})} 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">نوع الحقل</label>
              <select className="input" value={newField.fieldType} onChange={e => setNewField({...newField, fieldType: e.target.value})}>
                <option value="TEXT">نص</option>
                <option value="NUMBER">رقم</option>
                <option value="DATE">تاريخ</option>
                <option value="SELECT">قائمة اختيارات</option>
              </select>
            </div>
            {newField.fieldType === "SELECT" && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">الخيارات (افصل بينها بفاصلة ,)</label>
                <input 
                  className="input" placeholder="خيار 1, خيار 2, خيار 3"
                  value={newField.options} onChange={e => setNewField({...newField, options: e.target.value})} 
                />
              </div>
            )}
            <button type="submit" disabled={adding} className="btn btn-primary" style={{ width: "100%", marginTop: 10 }}>
              {adding ? "جاري الإضافة..." : "حفظ الحقل الجديد"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

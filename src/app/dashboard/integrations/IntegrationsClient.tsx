"use client";

import { useState } from "react";

const PLATFORMS = [
  { id: "whatsapp", name: "WhatsApp Business", icon: "💬", color: "#25D366" },
  { id: "telegram", name: "Telegram Bot", icon: "✈️", color: "#0088cc" },
  { id: "twitter", name: "Twitter/X Monitor", icon: "𝕏", color: "#000000" },
  { id: "linkedin", name: "LinkedIn Leads", icon: "🔗", color: "#0077b5" },
];

export default function IntegrationsClient() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">تكامل المنصات الاجتماعية</h1>
          <p className="page-subtitle">إدارة الربط مع واتساب، تليجرام، ومنصات التواصل</p>
        </div>
      </div>

      <div className="grid-4 animate-in-1" style={{ marginBottom: 24 }}>
        {PLATFORMS.map((p) => (
          <div 
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`card ${activeTab === p.id ? "card-gold" : ""}`}
            style={{ 
              cursor: "pointer", 
              borderTop: `3px solid ${p.color}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px"
            }}
          >
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <span style={{ fontWeight: 700 }}>{p.name}</span>
          </div>
        ))}
      </div>

      <div className="card animate-in-2">
        {activeTab === "whatsapp" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>WhatsApp Business API 💬</h2>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">API Key</label>
              <input className="input" type="password" placeholder="أدخل مفتاح API الخاص بك" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Phone Number ID</label>
              <input className="input" placeholder="مثال: 10563456789" />
            </div>
            <button className="btn btn-primary">حفظ الإعدادات</button>
            
            <div className="divider" />
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>القوالب الجاهزة (Templates)</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>اسم القالب</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>welcome_message</td>
                    <td><span className="badge badge-green">مفعل</span></td>
                    <td><button className="btn btn-ghost btn-sm">تعديل</button></td>
                  </tr>
                  <tr>
                    <td>property_update</td>
                    <td><span className="badge badge-gold">قيد المراجعة</span></td>
                    <td><button className="btn btn-ghost btn-sm">معاينة</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "telegram" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Telegram Bot ✈️</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
              استخدم البوت لاستقبال تنبيهات فورية عن العملاء الجدد أو المهام المسندة.
            </p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Bot Token</label>
              <input className="input" type="password" placeholder="712345678:AAH..." />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Chat ID</label>
              <input className="input" placeholder="-100123456789" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary">حفظ الإعدادات</button>
              <button className="btn btn-secondary">إرسال رسالة تجريبية</button>
            </div>
          </div>
        )}

        {activeTab === "twitter" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Twitter/X Monitoring 𝕏</h2>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">كلمات البحث للمراقبة (Keywords)</label>
              <input className="input" placeholder="مثال: دارك، شقق للبيع، استثمار عقاري" />
            </div>
            <button className="btn btn-primary">بدء المراقبة</button>

            <div className="divider" />
            <div className="empty-state">
              <div className="empty-state-icon">🔎</div>
              <div className="empty-state-text">سيتم عرض الإشارات (Mentions) والكلمات المفتاحية هنا فور ظهورها.</div>
            </div>
          </div>
        )}

        {activeTab === "linkedin" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>LinkedIn Leads 🔗</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
              ربط استمارات العملاء المحتملين من LinkedIn مباشرة بقاعدة بيانات CRM.
            </p>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              يحتاج هذا التكامل إلى حساب LinkedIn Campaign Manager.
            </div>
            <button className="btn btn-primary">ربط الحساب (OAuth)</button>
          </div>
        )}
      </div>
    </div>
  );
}

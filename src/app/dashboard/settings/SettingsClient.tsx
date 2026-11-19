"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DatabaseBackupModal from "@/components/DatabaseBackupModal";

export default function SettingsClient({ initialSettings }: any) {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const router = useRouter();

  const handleToggle = async (key: string) => {
    setLoading(true);
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newSettings[key] }),
      });
      router.refresh();
    } catch (err) {}
    finally { setLoading(false); }
  };

  const FEATURES = [
    { key: "kanbanEnabled", label: "لوحة الكانبان (Kanban Board)", desc: "عرض العملاء على شكل لوحات سحب وإفلات" },
    { key: "voiceSearchEnabled", label: "البحث الصوتي (Voice Search)", desc: "إمكانية البحث في النظام باستخدام الأوامر الصوتية" },
    { key: "smartLoggingEnabled", label: "المتابعة الذكية (Smart Logging)", desc: "تنبيه الموظف لتسجيل المكالمة فور العودة للتطبيق" },
    { key: "darkModeEnabled", label: "التبديل بين الوضع الليلي والنهاري", desc: "السماح للمستخدمين بتغيير ألوان واجهة النظام" },
    { key: "bulkActionsEnabled", label: "الإجراءات الجماعية (Bulk Actions)", desc: "تمكين التعديل والتعيين والحذف لمجموعة عملاء دفعة واحدة" },
    { key: "internalMentionsEnabled", label: "الإشارات الداخلية (@Mentions)", desc: "إمكانية الإشارة للموظفين في التعليقات والمتابعات" },
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {FEATURES.map((feat) => (
          <div key={feat.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 20, borderBottom: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{feat.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{feat.desc}</div>
            </div>
            <div 
              onClick={() => !loading && handleToggle(feat.key)}
              style={{
                width: 50, height: 26, borderRadius: 13, background: settings[feat.key] ? "var(--gold-primary)" : "var(--bg-elevated)",
                position: "relative", cursor: loading ? "wait" : "pointer", transition: "0.3s"
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3, left: settings[feat.key] ? 27 : 3, transition: "0.3s",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
              }} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Database Backup & Export Card */}
      <div style={{
        marginTop: 24,
        padding: "20px 24px",
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(15, 23, 42, 0.85))",
        border: "1px solid rgba(212, 175, 55, 0.25)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💾</span>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--gold-primary)" }}>
              سحب وتصدير قاعدة البيانات الشاملة
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
            تحميل نسخة احتياطية بصيغ (SQL, JSON, Excel) لاستخدامها أو ترحيلها إلى أي مزود آخر في حال بلوغ الحد الشهري.
          </div>
        </div>
        <button
          onClick={() => setBackupOpen(true)}
          className="btn btn-primary btn-sm"
          style={{ padding: "8px 20px" }}
        >
          سحب البيانات الآن ←
        </button>
      </div>

      <div style={{ marginTop: 20, textAlign: "left" }}>
        <button className="btn btn-ghost" onClick={() => router.refresh()}>🔄 تحديث النظام</button>
      </div>

      <DatabaseBackupModal isOpen={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  );
}

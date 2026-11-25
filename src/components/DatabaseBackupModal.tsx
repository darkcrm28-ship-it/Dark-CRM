"use client";

import { useState } from "react";

export default function DatabaseBackupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (format: "sql" | "json" | "xlsx") => {
    setDownloadingFormat(format);
    try {
      const response = await fetch(`/api/admin/backup?format=${format}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "فشل تحميل النسخة الاحتياطية");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      const extension = format === "sql" ? "sql" : format === "xlsx" ? "xlsx" : "json";
      a.download = `dark_crm_backup_${dateStr}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert("حدث خطأ أثناء تصدير البيانات: " + error.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 620,
          background: "linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.98))",
          backdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(212, 175, 55, 0.12)",
          borderRadius: 20,
          padding: 28,
          color: "var(--text-primary)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--gold-primary)", margin: 0 }}>
                تصدير بيانات النظام
              </h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
              نزّل مجموعة مختارة من بيانات النظام بصيغة SQL أو JSON أو Excel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ width: 34, height: 34, borderRadius: "50%", padding: 0, fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        {/* Security / Assurance Banner */}
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>⚡</span>
          <div style={{ fontSize: 12.5, color: "#a7f3d0", lineHeight: 1.5 }}>
            لاستعادة النظام بالكامل، استخدم نسخة قاعدة بيانات من مزود PostgreSQL ونسخة منفصلة من المرفقات.
          </div>
        </div>

        {/* Export Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* SQL Option */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(212, 175, 55, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                }}
              >
                💾
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--gold-primary)" }}>
                  تصدير أوامر SQL (.sql)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  أوامر إدخال لجداول محددة تتطلب مخططًا مطابقًا.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload("sql")}
              disabled={!!downloadingFormat}
              className="btn btn-primary btn-sm"
              style={{ padding: "8px 18px", whiteSpace: "nowrap" }}
            >
              {downloadingFormat === "sql" ? "جاري التجهيز..." : "تحميل SQL ↓"}
            </button>
          </div>

          {/* JSON Option */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                📦
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--accent-blue)" }}>
                  تصدير بيانات منظم (.json)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  ملف منظم يوضح نطاق البيانات المُصدّرة.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload("json")}
              disabled={!!downloadingFormat}
              className="btn btn-secondary btn-sm"
              style={{ padding: "8px 18px", whiteSpace: "nowrap" }}
            >
              {downloadingFormat === "json" ? "جاري التجهيز..." : "تحميل JSON ↓"}
            </button>
          </div>

          {/* Excel Option */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                📊
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--accent-green)" }}>
                  تصدير ملف إكسل شامل (.xlsx)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  شيتات منفصلة للعملاء، العقارات، الصفقات، والمستخدمين لفتحها في Excel
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload("xlsx")}
              disabled={!!downloadingFormat}
              className="btn btn-secondary btn-sm"
              style={{ padding: "8px 18px", whiteSpace: "nowrap" }}
            >
              {downloadingFormat === "xlsx" ? "جاري التجهيز..." : "تحميل Excel ↓"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "8px 22px" }}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

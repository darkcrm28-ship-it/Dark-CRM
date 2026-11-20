"use client";

import React from "react";

export interface SheetConfig {
  sheetName: string;
  selected: boolean;
  rowCount: number;
  headers: string[];
  defaultType: "SELLER" | "BUYER" | "LEAD";
  defaultStatus: string;
  defaultProjectId: string;
  columnMapping: Record<string, string>;
  unmappedAction: "CUSTOM_DATA" | "IGNORE";
}

interface SheetSelectorStepProps {
  sheets: Record<string, SheetConfig>;
  activeSheetName: string;
  projects: Array<{ id: string; name: string }>;
  onToggleSheet: (name: string, selected: boolean) => void;
  onSelectActiveSheet: (name: string) => void;
  onUpdateSheetConfig: (name: string, updates: Partial<SheetConfig>) => void;
  onCopySettingsToAll: (sourceSheetName: string) => void;
}

export default function SheetSelectorStep({
  sheets,
  activeSheetName,
  projects,
  onToggleSheet,
  onSelectActiveSheet,
  onUpdateSheetConfig,
  onCopySettingsToAll,
}: SheetSelectorStepProps) {
  const sheetNames = Object.keys(sheets);
  const activeSheet = sheets[activeSheetName] || sheets[sheetNames[0]];

  const selectedCount = sheetNames.filter(n => sheets[n].selected).length;
  const totalRows = sheetNames.reduce((sum, n) => sum + (sheets[n].selected ? sheets[n].rowCount : 0), 0);

  return (
    <div>
      {/* Summary Banner */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", marginBottom: 20, borderRadius: 12,
        background: "rgba(212, 175, 55, 0.08)", border: "1px solid rgba(212, 175, 55, 0.25)"
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--gold-primary)", marginBottom: 4 }}>
            📑 الأوراق المكتشفة في الملف ({sheetNames.length} أوراق)
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            تم تحديد {selectedCount} ورقة عمل بإجمالي {totalRows.toLocaleString("ar-EG")} صف جاهز للإعداد.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left Column: List of Worksheets */}
        <div style={{
          border: "1px solid var(--border)", borderRadius: 12,
          padding: 12, maxHeight: 440, overflowY: "auto", background: "rgba(255,255,255,0.01)"
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            اختر أوراق العمل المراد استيرادها:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sheetNames.map((name) => {
              const cfg = sheets[name];
              const isActive = activeSheetName === name;

              return (
                <div
                  key={name}
                  onClick={() => onSelectActiveSheet(name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: isActive ? "2px solid var(--gold-primary)" : "1px solid var(--border-subtle)",
                    background: isActive ? "rgba(212, 175, 55, 0.12)" : "rgba(255,255,255,0.02)",
                    transition: "all 0.15s ease"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={cfg.selected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleSheet(name, e.target.checked);
                    }}
                    style={{ width: 18, height: 18, accentColor: "var(--gold-primary)", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                      color: cfg.selected ? "var(--text-primary)" : "var(--text-muted)"
                    }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {cfg.rowCount.toLocaleString("ar-EG")} صف • {cfg.headers.length} عمود
                    </div>
                  </div>
                  {isActive && <span style={{ fontSize: 11, color: "var(--gold-primary)", fontWeight: 800 }}>المعروضة</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Per-Sheet Independent Configuration */}
        {activeSheet ? (
          <div style={{
            border: "1px solid var(--border)", borderRadius: 12, padding: 20,
            background: "rgba(255,255,255,0.02)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>إعدادات الورقة المحددة:</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--gold-primary)", margin: "2px 0 0" }}>
                  📄 {activeSheet.sheetName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`هل تريد نسخ إعدادات ورقة (${activeSheet.sheetName}) إلى باقي الأوراق المحددة؟`)) {
                    onCopySettingsToAll(activeSheet.sheetName);
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                📋 نسخ هذه الإعدادات لباقي الأوراق
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* Customer Type for this sheet */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>نوع العملاء في هذه الورقة</label>
                <select
                  value={activeSheet.defaultType}
                  onChange={(e) => onUpdateSheetConfig(activeSheet.sheetName, {
                    defaultType: e.target.value as "SELLER" | "BUYER" | "LEAD"
                  })}
                  className="input"
                >
                  <option value="SELLER">بائع (SELLER)</option>
                  <option value="BUYER">مشتري (BUYER)</option>
                  <option value="LEAD">عميل محتمل (LEAD)</option>
                </select>
              </div>

              {/* Customer Status for this sheet */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>الحالة الافتراضية للعميل</label>
                <select
                  value={activeSheet.defaultStatus}
                  onChange={(e) => onUpdateSheetConfig(activeSheet.sheetName, { defaultStatus: e.target.value })}
                  className="input"
                >
                  {activeSheet.defaultType === "SELLER" && (
                    <>
                      <option value="POTENTIAL_SELLER">بائع محتمل (المخزون)</option>
                      <option value="WANTS_TO_SELL">راغب في البيع</option>
                      <option value="SELLER">بائع نشط</option>
                    </>
                  )}
                  {activeSheet.defaultType === "BUYER" && (
                    <>
                      <option value="BUYER">مشتري جاد</option>
                      <option value="INTERESTED">مهتم بالشراء</option>
                    </>
                  )}
                  {activeSheet.defaultType === "LEAD" && (
                    <>
                      <option value="POTENTIAL_SELLER">عميل محتمل عام</option>
                      <option value="INTERESTED">مهتم</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Project override for this sheet */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                المشروع الافتراضي لهذه الورقة (اختياري — يطغى على عمود المشروع)
              </label>
              <select
                value={activeSheet.defaultProjectId}
                onChange={(e) => onUpdateSheetConfig(activeSheet.sheetName, { defaultProjectId: e.target.value })}
                className="input"
              >
                <option value="">بدون مشروع افتراضي (الاعتماد على عمود المشروع بالملف)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Unmapped columns handling for this sheet */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                طريقة التعامل مع الأعمدة غير المعرفة في هذه الورقة
              </label>
              <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="radio"
                    name={`unmapped_${activeSheet.sheetName}`}
                    checked={activeSheet.unmappedAction === "CUSTOM_DATA"}
                    onChange={() => onUpdateSheetConfig(activeSheet.sheetName, { unmappedAction: "CUSTOM_DATA" })}
                    style={{ accentColor: "var(--gold-primary)" }}
                  />
                  <span>حفظ في البيانات الإضافية للعميل (Custom Data) لمنع فقدان أي بيانات</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="radio"
                    name={`unmapped_${activeSheet.sheetName}`}
                    checked={activeSheet.unmappedAction === "IGNORE"}
                    onChange={() => onUpdateSheetConfig(activeSheet.sheetName, { unmappedAction: "IGNORE" })}
                    style={{ accentColor: "var(--gold-primary)" }}
                  />
                  <span>تجاهل الأعمدة غير المربوطة</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            يرجى تحديد ورقة عمل لضبط إعداداتها
          </div>
        )}
      </div>
    </div>
  );
}

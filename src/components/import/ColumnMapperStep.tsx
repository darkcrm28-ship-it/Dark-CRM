"use client";

import React, { useState } from "react";
import { MappingTemplate, getSavedTemplates, saveCustomTemplate, suggestMatchingTemplate } from "@/lib/import-templates";

export interface ColumnMapperStepProps {
  sheetName: string;
  sourceHeaders: string[];
  sampleRow: Record<string, any>;
  mapping: Record<string, string>;
  customFieldDefs?: Array<{ id: string; name: string; label: string }>;
  onUpdateMapping: (columnName: string, targetField: string) => void;
  onApplyTemplate: (template: MappingTemplate) => void;
}

// قائمة الحقول القياسية في Dark CRM المصنفة حسب المجموعات
const TARGET_FIELD_GROUPS = [
  {
    group: "بيانات العميل الأساسية (إلزامية واختيارية)",
    fields: [
      { key: "name", label: "اسم العميل بالكامل * (إلزامي)", required: true },
      { key: "phone", label: "رقم الهاتف المحمول * (إلزامي)", required: true },
      { key: "email", label: "البريد الإلكتروني", required: false },
      { key: "nationalId", label: "الرقم القومي (14 رقماً)", required: false },
      { key: "source", label: "مصدر العميل (Source)", required: false },
    ]
  },
  {
    group: "بيانات ومواصفات الوحدة العقارية",
    fields: [
      { key: "projectName", label: "اسم المشروع / الكمبوند", required: false },
      { key: "unitNumber", label: "رقم الوحدة / الشقة", required: false },
      { key: "buildingNumber", label: "رقم العمارة / المبنى", required: false },
      { key: "floor", label: "الدور / الطابق", required: false },
      { key: "area", label: "المنطقة / الحي", required: false },
      { key: "propertyType", label: "نوع العقار (شقة، فيلا، مكتب...)", required: false },
      { key: "unitSize", label: "المساحة (م²)", required: false },
      { key: "bedrooms", label: "عدد الغرف", required: false },
      { key: "bathrooms", label: "عدد الحمامات", required: false },
      { key: "finishing", label: "حالة التشطيب", required: false },
      { key: "deliveryDate", label: "تاريخ الاستلام", required: false },
      { key: "executingCompany", label: "الشركة المنفذة / المطور", required: false },
    ]
  },
  {
    group: "الأسعار وتفاصيل الأقساط",
    fields: [
      { key: "askingPrice", label: "السعر الإجمالي المطلوب", required: false },
      { key: "installmentAmount", label: "قيمة القسط", required: false },
      { key: "installmentRemaining", label: "عدد الأقساط المتبقية", required: false },
      { key: "installmentDetails", label: "تفاصيل ونظام السداد", required: false },
    ]
  }
];

export default function ColumnMapperStep({
  sheetName,
  sourceHeaders,
  sampleRow,
  mapping,
  customFieldDefs = [],
  onUpdateMapping,
  onApplyTemplate
}: ColumnMapperStepProps) {
  const [templates, setTemplates] = useState<MappingTemplate[]>(() => getSavedTemplates());
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const suggested = suggestMatchingTemplate(sourceHeaders);

  // حساب التكرارات في الحقول المستهدفة (منع ربط عمودين بنفس الحقل)
  const targetUsageCounts: Record<string, number> = {};
  for (const target of Object.values(mapping)) {
    if (target && target !== "__IGNORE__" && target !== "__CUSTOM__") {
      targetUsageCounts[target] = (targetUsageCounts[target] || 0) + 1;
    }
  }

  const hasName = Object.values(mapping).includes("name");
  const hasPhone = Object.values(mapping).includes("phone");

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    const saved = saveCustomTemplate({
      name: newTemplateName.trim(),
      matchHeaders: sourceHeaders,
      mapping: { ...mapping }
    });
    setTemplates(getSavedTemplates());
    setShowSaveTemplateModal(false);
    setNewTemplateName("");
    alert(`✅ تم حفظ القالب "${saved.name}" بنجاح!`);
  };

  return (
    <div>
      {/* Top Bar: Template Selection & Suggestion */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        padding: "12px 18px", marginBottom: 16, borderRadius: 10,
        background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: "var(--gold-primary)" }}>
            ⚡ تطبيق قالب ربط مسبق:
          </span>
          <select
            onChange={(e) => {
              const tpl = templates.find(t => t.id === e.target.value);
              if (tpl) onApplyTemplate(tpl);
            }}
            defaultValue=""
            className="input"
            style={{ minWidth: 260, fontSize: 13, height: 38 }}
          >
            <option value="" disabled>اختر قالباً لتطبيقه على هذه الورقة...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.scope === "GLOBAL" ? "(قالب معتمد)" : "(مخصص)"}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowSaveTemplateModal(true)}
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: "8px 14px", height: 38 }}
        >
          💾 حفظ الربط الحالي كقالب جديد
        </button>
      </div>

      {/* Suggested Template Banner (if similarity >= 60%) */}
      {suggested && suggested.confidence >= 60 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", marginBottom: 16, borderRadius: 8,
          background: "rgba(0, 123, 255, 0.08)", border: "1px solid rgba(0, 123, 255, 0.3)"
        }}>
          <div style={{ fontSize: 13 }}>
            💡 يبدو أن أعمدة هذه الورقة تطابق <strong>{suggested.template.name}</strong> بنسبة <strong>{suggested.confidence}%</strong>.
          </div>
          <button
            type="button"
            onClick={() => onApplyTemplate(suggested.template)}
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "4px 12px", minWidth: 120 }}
          >
            تطبيق القالب المقترح
          </button>
        </div>
      )}

      {/* Mandatory Validation Warnings */}
      {(!hasName || !hasPhone) && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16,
          background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "var(--accent-red)", fontWeight: 700, fontSize: 13
        }}>
          ⚠️ تنبيه إلزامي: يجب ربط عمود لـ <strong>اسم العميل</strong> وعمود لـ <strong>رقم الهاتف</strong> لتتمكن من المتابعة.
        </div>
      )}

      {/* Column Mapping Table */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
        maxHeight: 460, overflowY: "auto"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 1 }}>
              <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, width: "25%" }}>اسم العمود في Excel</th>
              <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, width: "30%" }}>عينة من البيانات</th>
              <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, width: "35%" }}>الحقل المقابل في Dark CRM</th>
              <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800, width: "10%" }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {sourceHeaders.map((header, idx) => {
              const currentTarget = mapping[header] || "__CUSTOM__";
              const sampleVal = sampleRow ? String(sampleRow[header] ?? "—") : "—";
              const isDuplicateUsage = (targetUsageCounts[currentTarget] || 0) > 1;

              return (
                <tr
                  key={header}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"
                  }}
                >
                  {/* Excel Header Name */}
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "var(--text-primary)" }}>
                    {header}
                  </td>

                  {/* Sample Value */}
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 12, wordBreak: "break-all" }}>
                    {sampleVal}
                  </td>

                  {/* Target CRM Field Dropdown */}
                  <td style={{ padding: "8px 14px" }}>
                    <select
                      value={currentTarget}
                      onChange={(e) => onUpdateMapping(header, e.target.value)}
                      className="input"
                      style={{
                        width: "100%", height: 38, fontSize: 13,
                        borderColor: isDuplicateUsage ? "var(--accent-red)" : undefined
                      }}
                    >
                      <option value="__CUSTOM__">📋 حفظ كحقل إضافي (Custom Data)</option>
                      <option value="__IGNORE__">❌ تجاهل هذا العمود وعدم استيراده</option>

                      {TARGET_FIELD_GROUPS.map((grp) => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.fields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}

                      {customFieldDefs.length > 0 && (
                        <optgroup label="الحقول المخصصة المعرفة بالنظام">
                          {customFieldDefs.map((def) => (
                            <option key={def.name} value={def.name}>
                              {def.label} (حقل ديناميكي)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {isDuplicateUsage && (
                      <div style={{ color: "var(--accent-red)", fontSize: 11, marginTop: 4 }}>
                        ⚠️ هذا الحقل مربوط بأكثر من عمود
                      </div>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {currentTarget === "name" || currentTarget === "phone" ? (
                      <span className="badge badge-gold" style={{ fontSize: 11, padding: "3px 8px" }}>إلزامي</span>
                    ) : currentTarget === "__CUSTOM__" ? (
                      <span className="badge badge-purple" style={{ fontSize: 11, padding: "3px 8px" }}>إضافي</span>
                    ) : currentTarget === "__IGNORE__" ? (
                      <span className="badge badge-gray" style={{ fontSize: 11, padding: "3px 8px" }}>مستبعد</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: 11, padding: "3px 8px" }}>مربوط</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <form
            onSubmit={handleSaveTemplate}
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 12, padding: 24, width: "100%", maxWidth: 440
            }}
          >
            <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--gold-primary)", marginBottom: 12 }}>
              💾 حفظ إعدادات الربط الحالية كقالب
            </h4>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              سيتم حفظ مطابقات أعمدة ورقة ({sheetName}) لتتمكن من إعادة تطبيقها تلقائياً على أي ملف مستقبلي يحمل نفس التنسيق.
            </p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">اسم القالب</label>
              <input
                type="text"
                required
                placeholder="مثال: قالب مبيعات شركة X - 2026"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="input"
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="btn btn-ghost"
              >
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary">
                حفظ القالب
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

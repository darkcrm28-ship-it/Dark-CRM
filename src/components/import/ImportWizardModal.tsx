"use client";

import React, { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import {
  normalizeEgyptianPhone,
  normalizeArabicText,
  normalizeNationalId,
  normalizeDate
} from "@/lib/excel-normalizer";
import { MappingTemplate, BUILTIN_TEMPLATES, suggestMatchingTemplate } from "@/lib/import-templates";
import SheetSelectorStep, { SheetConfig } from "./SheetSelectorStep";
import ColumnMapperStep from "./ColumnMapperStep";
import PreviewStep, { PreviewRow } from "./PreviewStep";

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  customFieldDefs?: Array<{ id: string; name: string; label: string }>;
}

export default function ImportWizardModal({
  isOpen,
  onClose,
  projects,
  customFieldDefs = [],
}: ImportWizardModalProps) {
  const router = useRouter();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // File & Sheet State
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetConfigs, setSheetConfigs] = useState<Record<string, SheetConfig>>({});
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [sampleRows, setSampleRows] = useState<Record<string, Record<string, any>>>({});

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionStatusText, setExecutionStatusText] = useState("");
  const [executionResults, setExecutionResults] = useState<{
    inserted: number;
    duplicates: number;
    failed: number;
  }>({ inserted: 0, duplicates: 0, failed: 0 });

  // ─── Step 1: Handle File Upload ───────────────────────────────────────────
  const handleFile = useCallback((uploadedFile: File) => {
    setFile(uploadedFile);
    setCurrentStep(1);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellText: true, cellDates: true, raw: false });
        setWorkbook(wb);

        const configs: Record<string, SheetConfig> = {};
        const samples: Record<string, Record<string, any>> = {};

        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          if (!sheet) continue;

          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
          const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

          // Auto-mapping using aliases
          const initialMapping: Record<string, string> = {};
          const autoTpl = suggestMatchingTemplate(headers) || { template: BUILTIN_TEMPLATES[0], confidence: 50 };

          for (const h of headers) {
            const clean = String(h || "").trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/[\s_\-()]+/g, "");
            for (const [tplHeader, targetField] of Object.entries(autoTpl.template.mapping)) {
              const tplClean = String(tplHeader).trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/[\s_\-()]+/g, "");
              if (clean === tplClean) {
                initialMapping[h] = targetField;
                break;
              }
            }
            if (!initialMapping[h]) {
              initialMapping[h] = "__CUSTOM__";
            }
          }

          configs[sheetName] = {
            sheetName,
            selected: true, // Selected by default
            rowCount: rawRows.length,
            headers,
            defaultType: "SELLER",
            defaultStatus: "POTENTIAL_SELLER",
            defaultProjectId: "",
            columnMapping: initialMapping,
            unmappedAction: "CUSTOM_DATA",
          };

          samples[sheetName] = rawRows[0] || {};
        }

        setSheetConfigs(configs);
        setSampleRows(samples);
        const firstSheet = wb.SheetNames[0] || "";
        setActiveSheetName(firstSheet);
        setCurrentStep(2); // Move to Sheet Config
      } catch (err) {
        console.error("Error reading Excel:", err);
        alert("❌ تعذر قراءة ملف Excel. تأكد من أن الملف سليم ويحتوي على أوراق عمل صالحة.");
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  // ─── Multi-Sheet Handlers ────────────────────────────────────────────────
  const handleToggleSheet = (name: string, selected: boolean) => {
    setSheetConfigs(prev => ({
      ...prev,
      [name]: { ...prev[name], selected }
    }));
  };

  const handleUpdateSheetConfig = (name: string, updates: Partial<SheetConfig>) => {
    setSheetConfigs(prev => ({
      ...prev,
      [name]: { ...prev[name], ...updates }
    }));
  };

  const handleCopySettingsToAll = (sourceName: string) => {
    const src = sheetConfigs[sourceName];
    if (!src) return;

    setSheetConfigs(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key !== sourceName && next[key].selected) {
          next[key] = {
            ...next[key],
            defaultType: src.defaultType,
            defaultStatus: src.defaultStatus,
            defaultProjectId: src.defaultProjectId,
            unmappedAction: src.unmappedAction,
            columnMapping: { ...src.columnMapping }
          };
        }
      }
      return next;
    });
  };

  const handleUpdateMapping = (header: string, targetField: string) => {
    if (!activeSheetName || !sheetConfigs[activeSheetName]) return;
    setSheetConfigs(prev => ({
      ...prev,
      [activeSheetName]: {
        ...prev[activeSheetName],
        columnMapping: {
          ...prev[activeSheetName].columnMapping,
          [header]: targetField
        }
      }
    }));
  };

  const handleApplyTemplate = (tpl: MappingTemplate) => {
    if (!activeSheetName || !sheetConfigs[activeSheetName]) return;
    const currentHeaders = sheetConfigs[activeSheetName].headers;
    const newMapping: Record<string, string> = {};

    for (const h of currentHeaders) {
      if (tpl.mapping[h]) {
        newMapping[h] = tpl.mapping[h];
      } else {
        newMapping[h] = "__CUSTOM__";
      }
    }

    setSheetConfigs(prev => ({
      ...prev,
      [activeSheetName]: {
        ...prev[activeSheetName],
        columnMapping: newMapping,
        defaultType: tpl.defaultType || prev[activeSheetName].defaultType,
        defaultStatus: tpl.defaultStatus || prev[activeSheetName].defaultStatus
      }
    }));
  };

  // ─── Step 4: Parse & Validate Rows for Preview ────────────────────────────
  const previewData = useMemo<PreviewRow[]>(() => {
    if (!workbook) return [];
    const allPreviewRows: PreviewRow[] = [];

    const selectedSheets = Object.values(sheetConfigs).filter(s => s.selected);
    for (const sCfg of selectedSheets) {
      const ws = workbook.Sheets[sCfg.sheetName];
      if (!ws) continue;

      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      const mapping = sCfg.columnMapping;

      rawRows.forEach((row, index) => {
        let nameVal = "";
        let phoneVal = "";
        let natIdVal = "";
        let unitVal = "";
        let bldVal = "";
        let projVal = "";
        let dateVal = "";
        let priceVal = "";
        let areaVal = "";
        let floorVal = "";
        const customData: Record<string, any> = {};

        for (const [colName, targetField] of Object.entries(mapping)) {
          const cellVal = String(row[colName] ?? "").trim();
          if (!cellVal) continue;

          if (targetField === "name") nameVal = cellVal;
          else if (targetField === "phone") phoneVal = cellVal;
          else if (targetField === "nationalId") natIdVal = cellVal;
          else if (targetField === "unitNumber") unitVal = cellVal;
          else if (targetField === "buildingNumber") bldVal = cellVal;
          else if (targetField === "projectName") projVal = cellVal;
          else if (targetField === "deliveryDate") dateVal = cellVal;
          else if (targetField === "askingPrice") priceVal = cellVal;
          else if (targetField === "area") areaVal = cellVal;
          else if (targetField === "floor") floorVal = cellVal;
          else if (targetField === "__CUSTOM__") {
            if (sCfg.unmappedAction === "CUSTOM_DATA") customData[colName] = cellVal;
          }
        }

        const phoneNorm = normalizeEgyptianPhone(phoneVal);
        const natIdNorm = natIdVal ? normalizeNationalId(natIdVal) : null;
        const dateNorm = dateVal ? normalizeDate(dateVal) : null;

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!nameVal) errors.push("الاسم مطلوب");
        if (!phoneNorm.isValid) errors.push(phoneNorm.error || "رقم الهاتف غير صالح");
        if (natIdNorm && !natIdNorm.isValid) errors.push(natIdNorm.error || "الرقم القومي غير صالح");
        if (dateNorm && !dateNorm.isValid) errors.push(dateNorm.error || "تاريخ غير صالح");

        allPreviewRows.push({
          _rowNumber: index + 2,
          _sheetName: sCfg.sheetName,
          name: nameVal ? normalizeArabicText(nameVal) : "",
          phone: phoneNorm.isValid ? phoneNorm.phone : phoneVal,
          nationalId: natIdNorm?.isValid ? natIdNorm.nationalId : natIdVal,
          unitNumber: unitVal,
          buildingNumber: bldVal,
          projectName: projVal || (sCfg.defaultProjectId ? projects.find(p => p.id === sCfg.defaultProjectId)?.name : ""),
          deliveryDate: dateNorm?.isValid ? (dateNorm.isoDate || dateVal) : dateVal,
          askingPrice: priceVal,
          area: areaVal,
          floor: floorVal,
          customData,
          _errors: errors,
          _warnings: warnings
        });
      });
    }

    return allPreviewRows;
  }, [workbook, sheetConfigs, projects]);

  // Valid rows count across all selected sheets
  const totalValidRows = useMemo(() => {
    return previewData.filter(r => !r._errors?.length);
  }, [previewData]);

  // ─── Step 5: Execute Import in Batches (200 rows/batch) ───────────────────
  const handleExecuteImport = async () => {
    if (!totalValidRows.length) return;

    setIsExecuting(true);
    setCurrentStep(5);
    setExecutionProgress(0);

    let totalInserted = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    const batchSize = 200;
    const batchesCount = Math.ceil(totalValidRows.length / batchSize);

    try {
      for (let bIdx = 0; bIdx < batchesCount; bIdx++) {
        const start = bIdx * batchSize;
        const currentBatch = totalValidRows.slice(start, start + batchSize);

        setExecutionStatusText(`⏳ جاري إرسال الدفعة ${bIdx + 1} من ${batchesCount} (${start + 1} إلى ${Math.min(start + batchSize, totalValidRows.length)})...`);
        setExecutionProgress(Math.round(((bIdx) / batchesCount) * 100));

        let retryCount = 0;
        let success = false;

        while (!success && retryCount < 3) {
          try {
            const res = await fetch("/api/customers/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customers: currentBatch.map((row) => ({
                  name: row.name,
                  phone: row.phone,
                  nationalId: row.nationalId,
                  unitNumber: row.unitNumber,
                  buildingNumber: row.buildingNumber,
                  projectName: row.projectName,
                  deliveryDate: row.deliveryDate,
                  askingPrice: row.askingPrice,
                  area: row.area,
                  floor: row.floor,
                  customData: row.customData
                })),
                projectId: null // Handled per row
              })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
              totalInserted += Number(data.count || 0);
              totalDuplicates += Number(data.duplicates || 0);
              totalFailed += Number(data.failed || 0);
              success = true;
            } else if (res.status === 409) {
              // Advisory Lock conflict - wait and retry
              retryCount++;
              setExecutionStatusText(`⏳ هناك عملية استيراد أخرى قيد التنفيذ، جاري إعادة المحاولة تلقائياً بعد ثانيتين (محاولة ${retryCount} من 3)...`);
              await new Promise(r => setTimeout(r, 2000));
            } else {
              totalFailed += currentBatch.length;
              console.error("Batch error:", data);
              success = true; // Move to next
            }
          } catch {
            retryCount++;
            setExecutionStatusText(`⚠️ ضعف في الاتصال، جاري إعادة المحاولة...`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      setExecutionProgress(100);
      setExecutionStatusText("✅ اكتمل الاستيراد بنجاح!");
      setExecutionResults({
        inserted: totalInserted,
        duplicates: totalDuplicates,
        failed: totalFailed
      });
      router.refresh();
    } catch (err) {
      console.error("Import execution fatal error:", err);
      setExecutionStatusText("❌ حدث خطأ غير متوقع أثناء الاستيراد.");
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 16, width: "100%", maxWidth: 1040, maxHeight: "92vh",
        display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.6)"
      }}>
        {/* Wizard Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
                معالج استيراد Excel الذكي (Smart Excel Import Wizard)
              </h2>
              {file && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  الملف: <strong>{file.name}</strong> ({((file.size || 0) / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="btn-close"
            style={{ fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        {/* Stepper Navigation Indicator */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(255,255,255,0.015)"
        }}>
          {[
            { num: 1, label: "1. اختيار الملف" },
            { num: 2, label: "2. أوراق العمل والإعدادات" },
            { num: 3, label: "3. ربط الأعمدة والقوالب" },
            { num: 4, label: "4. المعاينة والفحص الصحي" },
            { num: 5, label: "5. التنفيذ والنتائج" }
          ].map((s) => {
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <div
                key={s.num}
                style={{
                  flex: 1, padding: "12px 10px", textAlign: "center",
                  borderBottom: isCurrent ? "3px solid var(--gold-primary)" : "3px solid transparent",
                  color: isCurrent ? "var(--gold-primary)" : isCompleted ? "var(--accent-green)" : "var(--text-muted)",
                  fontWeight: isCurrent ? 800 : 600, fontSize: 13,
                  background: isCurrent ? "rgba(212,175,55,0.05)" : "transparent"
                }}
              >
                {isCompleted ? "✔ " : ""}{s.label}
              </div>
            );
          })}
        </div>

        {/* Wizard Step Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {/* STEP 1: Upload */}
          {currentStep === 1 && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) handleFile(droppedFile);
                }}
                style={{
                  border: "2px dashed var(--gold-primary)", borderRadius: 16,
                  padding: "48px 24px", background: "rgba(212,175,55,0.03)",
                  cursor: "pointer", transition: "all 0.2s"
                }}
                onClick={() => document.getElementById("wizard-file-input")?.click()}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--gold-primary)", marginBottom: 8 }}>
                  اسحب وأفلت ملف Excel هنا، أو انقر للاختيار
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 460, margin: "0 auto 20px" }}>
                  يدعم الملفات بصيغة (.xlsx / .xls) متعددة الأوراق والملفات الضخمة
                </p>
                <button type="button" className="btn btn-primary" style={{ pointerEvents: "none" }}>
                  تصفح الملفات
                </button>
                <input
                  id="wizard-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Sheet Selector & Config */}
          {currentStep === 2 && (
            <SheetSelectorStep
              sheets={sheetConfigs}
              activeSheetName={activeSheetName}
              projects={projects}
              onToggleSheet={handleToggleSheet}
              onSelectActiveSheet={setActiveSheetName}
              onUpdateSheetConfig={handleUpdateSheetConfig}
              onCopySettingsToAll={handleCopySettingsToAll}
            />
          )}

          {/* STEP 3: Column Mapping */}
          {currentStep === 3 && activeSheetName && sheetConfigs[activeSheetName] && (
            <div>
              {/* Sheet Switcher if multiple selected */}
              {Object.values(sheetConfigs).filter(s => s.selected).length > 1 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, alignSelf: "center", color: "var(--gold-primary)", marginLeft: 8 }}>
                    ربط أعمدة الورقة:
                  </span>
                  {Object.values(sheetConfigs).filter(s => s.selected).map((s) => (
                    <button
                      key={s.sheetName}
                      type="button"
                      onClick={() => setActiveSheetName(s.sheetName)}
                      className={activeSheetName === s.sheetName ? "btn btn-primary" : "btn btn-ghost"}
                      style={{ fontSize: 12, padding: "4px 12px", height: 30 }}
                    >
                      📄 {s.sheetName}
                    </button>
                  ))}
                </div>
              )}

              <ColumnMapperStep
                sheetName={activeSheetName}
                sourceHeaders={sheetConfigs[activeSheetName].headers}
                sampleRow={sampleRows[activeSheetName] || {}}
                mapping={sheetConfigs[activeSheetName].columnMapping}
                customFieldDefs={customFieldDefs}
                onUpdateMapping={handleUpdateMapping}
                onApplyTemplate={handleApplyTemplate}
              />
            </div>
          )}

          {/* STEP 4: Preview & Health Check */}
          {currentStep === 4 && (
            <PreviewStep
              rows={previewData}
              activeSheetName={activeSheetName}
              sheetNames={Object.values(sheetConfigs).filter(s => s.selected).map(s => s.sheetName)}
              onSelectSheet={setActiveSheetName}
            />
          )}

          {/* STEP 5: Execution & Progress */}
          {currentStep === 5 && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {isExecuting ? "⏳" : executionResults.inserted > 0 ? "🎉" : "⚠️"}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
                {executionStatusText}
              </h3>

              {/* Progress Bar */}
              <div style={{
                width: "100%", maxWidth: 500, height: 12, borderRadius: 6,
                background: "rgba(255,255,255,0.1)", margin: "0 auto 20px", overflow: "hidden"
              }}>
                <div style={{
                  width: `${executionProgress}%`, height: "100%",
                  background: "var(--gold-primary)", transition: "width 0.3s ease"
                }} />
              </div>

              {/* Live Counters */}
              <div style={{
                display: "flex", justifyContent: "center", gap: 24, marginTop: 24
              }}>
                <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent-green)" }}>
                    {executionResults.inserted.toLocaleString("ar-EG")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>سجل أُضيف بنجاح</div>
                </div>

                <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--gold-primary)" }}>
                    {executionResults.duplicates.toLocaleString("ar-EG")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>تكرار تم تجاوزه بأمان</div>
                </div>

                <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent-red)" }}>
                    {executionResults.failed.toLocaleString("ar-EG")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>سجل غير صالح / فشل</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", borderTop: "1px solid var(--border)",
          background: "rgba(255,255,255,0.015)"
        }}>
          <div>
            {currentStep > 1 && currentStep < 5 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => (s - 1) as any)}
                className="btn btn-ghost"
              >
                ⬅️ الخطوة السابقة
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="btn btn-ghost"
            >
              {currentStep === 5 ? "إغلاق" : "إلغاء"}
            </button>

            {currentStep === 1 && file && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn btn-primary"
              >
                متابعة ⬅️
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                disabled={!Object.values(sheetConfigs).some(s => s.selected)}
                onClick={() => setCurrentStep(3)}
                className="btn btn-primary"
              >
                متابعة إلى ربط الأعمدة ⬅️
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                disabled={
                  !Object.values(sheetConfigs[activeSheetName]?.columnMapping || {}).includes("name") ||
                  !Object.values(sheetConfigs[activeSheetName]?.columnMapping || {}).includes("phone")
                }
                onClick={() => setCurrentStep(4)}
                className="btn btn-primary"
              >
                متابعة إلى المعاينة ⬅️
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                disabled={totalValidRows.length === 0}
                onClick={handleExecuteImport}
                className="btn btn-primary"
                style={{ fontSize: 14, padding: "8px 24px" }}
              >
                🚀 بدء استيراد {totalValidRows.length.toLocaleString("ar-EG")} سجل صالح
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
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
  onImported: () => void;
  projects: Array<{ id: string; name: string }>;
  customFieldDefs?: Array<{ id: string; name: string; label: string }>;
}

export default function ImportWizardModal({
  isOpen,
  onClose,
  onImported,
  projects,
  customFieldDefs = [],
}: ImportWizardModalProps) {

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // File & Sheet State
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetConfigs, setSheetConfigs] = useState<Record<string, SheetConfig>>({});
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [sampleRows, setSampleRows] = useState<Record<string, Record<string, any>>>({});

  // File size warnings
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionStatusText, setExecutionStatusText] = useState("");
  const [executionResults, setExecutionResults] = useState<{
    inserted: number;
    duplicates: number;
    coOwners: number;
    review: number;
    failed: number;
  }>({ inserted: 0, duplicates: 0, coOwners: 0, review: 0, failed: 0 });

  // ─── Step 1: Handle File Upload ───────────────────────────────────────────
  const handleFile = useCallback((uploadedFile: File) => {
    setFile(uploadedFile);
    setImportId(crypto.randomUUID());
    setCurrentStep(1);
    setFileSizeWarning(null);

    // ⚠️ تحذير حجم الملف
    if (uploadedFile.size > 10 * 1024 * 1024) {
      setFileSizeWarning(`⚠️ حجم الملف كبير (${(uploadedFile.size / 1024 / 1024).toFixed(1)} ميجابايت). قد تستغرق المعالجة وقتاً أطول.`);
    }

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

        // ⚠️ تحذير عدد الصفوف الكلي
        const totalRows = Object.values(configs).reduce((s, c) => s + c.rowCount, 0);
        if (totalRows > 10000) {
          setFileSizeWarning(prev => (prev ? prev + " " : "") + `⚠️ الملف يحتوي على ${totalRows.toLocaleString("ar-EG")} صف. الاستيراد الضخم يُنصح بتقسيمه على دفعات.`);
        } else if (totalRows > 5000) {
          setFileSizeWarning(prev => (prev ? prev + " " : "") + `⚠️ ${totalRows.toLocaleString("ar-EG")} صف سيتم معالجتها. تأكد من اختيار الأوراق المطلوبة فقط.`);
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

      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      const mapping = sCfg.columnMapping;

      // دالة مساعدة: استخراج قيمة خلية حسب اسم الحقل المستهدف
      const cell = (row: any, field: string): string => {
        for (const [col, tgt] of Object.entries(mapping)) {
          if (tgt === field) return String(row[col] ?? '').trim();
        }
        return '';
      };

      rawRows.forEach((row, index) => {
        // ── بيانات العميل الأساسية ──
        const nameVal      = cell(row, 'name');
        const phoneVal     = cell(row, 'phone');
        const natIdVal     = cell(row, 'nationalId');
        const emailVal     = cell(row, 'email');
        const typeVal      = cell(row, 'type')   || sCfg.defaultType;
        const statusVal    = cell(row, 'status') || sCfg.defaultStatus;
        const sourceVal    = cell(row, 'source');
        const custTypeVal  = cell(row, 'customerType');
        const leadScoreVal = cell(row, 'leadScore');

        // ── بيانات الوحدة العقارية ──
        const projNameVal    = cell(row, 'projectName');
        const unitVal        = cell(row, 'unitNumber');
        const bldVal         = cell(row, 'buildingNumber');
        const zoneVal        = cell(row, 'zoneNumber');
        const floorVal       = cell(row, 'floor');
        const areaVal        = cell(row, 'area');
        const govVal         = cell(row, 'governorate');
        const cityVal        = cell(row, 'city');
        const propTypeVal    = cell(row, 'propertyType');
        const unitSizeVal    = cell(row, 'unitSize');
        const bedroomsVal    = cell(row, 'bedrooms');
        const bathroomsVal   = cell(row, 'bathrooms');
        const finishingVal   = cell(row, 'finishing');
        const unitStatusVal  = cell(row, 'unitStatus');
        const dateVal        = cell(row, 'deliveryDate');
        const execCoVal      = cell(row, 'executingCompany');
        const paperworkVal   = cell(row, 'paperworkStatus');

        // ── الأسعار والسداد ──
        const priceVal    = cell(row, 'askingPrice');
        const instAmtVal  = cell(row, 'installmentAmount');
        const instRemVal  = cell(row, 'installmentRemaining');
        const instDetVal  = cell(row, 'installmentDetails');
        const budMinVal   = cell(row, 'budgetMin');
        const budMaxVal   = cell(row, 'budgetMax');

        // ── البيانات المخصصة (الحقول غير المربوطة) ──
        const customData: Record<string, any> = {};
        for (const [colName, targetField] of Object.entries(mapping)) {
          if (targetField === '__CUSTOM__' && sCfg.unmappedAction === 'CUSTOM_DATA') {
            const v = String(row[colName] ?? '').trim();
            if (v) customData[colName] = v;
          }
        }

        // ── تطبيع البيانات ──
        const phoneNorm = normalizeEgyptianPhone(phoneVal);
        const natIdNorm = natIdVal ? normalizeNationalId(natIdVal) : null;
        const dateNorm  = dateVal  ? normalizeDate(dateVal)        : null;

        // ── التحقق من الصحة ──
        const errors: string[]   = [];
        const warnings: string[] = [];

        if (!nameVal)                        errors.push('الاسم مطلوب');
        if (!phoneNorm.isValid)              errors.push(phoneNorm.error || 'رقم الهاتف غير صالح');
        if (natIdNorm && !natIdNorm.isValid) errors.push(natIdNorm.error || 'الرقم القومي غير صالح');
        if (dateNorm  && !dateNorm.isValid)  warnings.push(dateNorm.error || 'تاريخ التسليم غير واضح');

        // تحذير: دقة الرقم القومي المخزن كرقم في Excel
        let suspectPrecision = false;
        if (natIdVal && /^[\d.]+$/.test(natIdVal)) {
          const rawNum = natIdVal.replace(/\..*/, '');
          if (rawNum.length !== 14) {
            warnings.push('قد يكون الرقم القومي فقد دقته بسبب تخزينه كرقم في Excel — تحقق منه');
            suspectPrecision = true;
          }
        }

        const resolvedProjectName =
          projNameVal ||
          (sCfg.defaultProjectId ? (projects.find(p => p.id === sCfg.defaultProjectId)?.name ?? '') : '');

        allPreviewRows.push({
          _rowNumber:        index + 2,
          _sheetName:        sCfg.sheetName,
          _errors:           errors,
          _warnings:         warnings.length ? warnings : undefined,
          _suspectPrecision: suspectPrecision || undefined,

          // بيانات العميل
          name:         nameVal ? normalizeArabicText(nameVal) : '',
          phone:        phoneNorm.isValid ? (phoneNorm.phone ?? phoneVal) : phoneVal,
          nationalId:   natIdNorm?.isValid ? natIdNorm.nationalId : (natIdVal || undefined),
          email:        emailVal || undefined,
          type:         typeVal   || undefined,
          status:       statusVal || undefined,
          source:       sourceVal || undefined,
          customerType: custTypeVal  || undefined,
          leadScore:    leadScoreVal || undefined,
          projectId:    sCfg.defaultProjectId || undefined,

          // بيانات الوحدة
          projectName:      resolvedProjectName || undefined,
          unitNumber:       unitVal    || undefined,
          buildingNumber:   bldVal     || undefined,
          zoneNumber:       zoneVal    || undefined,
          floor:            floorVal   || undefined,
          area:             areaVal    || undefined,
          governorate:      govVal     || undefined,
          city:             cityVal    || undefined,
          propertyType:     propTypeVal   || undefined,
          unitSize:         unitSizeVal   || undefined,
          bedrooms:         bedroomsVal   || undefined,
          bathrooms:        bathroomsVal  || undefined,
          finishing:        finishingVal  || undefined,
          unitStatus:       unitStatusVal || undefined,
          deliveryDate:     dateNorm?.isValid ? (dateNorm.isoDate || dateVal) : (dateVal || undefined),
          executingCompany: execCoVal   || undefined,
          paperworkStatus:  paperworkVal || undefined,

          // أسعار وسداد
          askingPrice:          priceVal   || undefined,
          installmentAmount:    instAmtVal || undefined,
          installmentRemaining: instRemVal || undefined,
          installmentDetails:   instDetVal || undefined,
          budgetMin:            budMinVal  || undefined,
          budgetMax:            budMaxVal  || undefined,

          customData: Object.keys(customData).length ? customData : undefined,
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

    let totalInserted  = 0;
    let totalDuplicates = 0;
    let totalCoOwners  = 0;
    let totalReview    = 0;
    // Include rejected preview rows in the final execution summary; only valid
    // rows are sent to the save endpoint.
    let totalFailed    = previewData.length - totalValidRows.length;

    // بناء مُعرِّف ثابت للاستيراد الحالي (اسم الملف + حجمه + تاريخ اليوم)
    const fileTag = importId || crypto.randomUUID();

    const batchSize = 200;
    const batchesCount = Math.ceil(totalValidRows.length / batchSize);

    // تجميع الصفوف حسب الورقة للحصول على إعدادات كل ورقة
    const sheetConfigMap = new Map(Object.values(sheetConfigs).map(s => [s.sheetName, s]));

    try {
      for (let bIdx = 0; bIdx < batchesCount; bIdx++) {
        const start = bIdx * batchSize;
        const currentBatch = totalValidRows.slice(start, start + batchSize);

        setExecutionStatusText(`⏳ جاري إرسال الدفعة ${bIdx + 1} من ${batchesCount} (${start + 1} إلى ${Math.min(start + batchSize, totalValidRows.length)})...`);
        setExecutionProgress(Math.round(((bIdx) / batchesCount) * 100));

        // مُعرِّف فريد لهذه الدفعة (ثابت عند إعادة الإرسال)
        const batchId = `${fileTag}_batch${bIdx + 1}_of${batchesCount}`;

        // استخراج projectId الخاص بالورقة الأولى في الدفعة (أو null)
        const firstRow = currentBatch[0];
        const sheetCfg = firstRow ? sheetConfigMap.get(firstRow._sheetName) : undefined;
        const batchProjectId = sheetCfg?.defaultProjectId || null;

        let retryCount = 0;
        let success = false;

        while (!success && retryCount < 3) {
          try {
            const res = await fetch('/api/customers/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                batchId,
                projectId: batchProjectId,
                customers: currentBatch.map((row) => ({
                  // ── بيانات العميل الأساسية ──
                  name:         row.name,
                  phone:        row.phone,
                  nationalId:   row.nationalId,
                  email:        row.email,
                  type:         row.type,
                  status:       row.status,
                  source:       row.source,
                  customerType: row.customerType,
                  leadScore:    row.leadScore ? Number(row.leadScore) : undefined,

                  // ── بيانات الوحدة العقارية ──
                  projectName:      row.projectName,
                  projectId:        row.projectId || batchProjectId,
                  unitNumber:       row.unitNumber,
                  buildingNumber:   row.buildingNumber,
                  zoneNumber:       row.zoneNumber,
                  floor:            row.floor,
                  area:             row.area,
                  governorate:      row.governorate,
                  city:             row.city,
                  propertyType:     row.propertyType,
                  unitSize:         row.unitSize    ? Number(row.unitSize)    : undefined,
                  bedrooms:         row.bedrooms    ? Number(row.bedrooms)    : undefined,
                  bathrooms:        row.bathrooms   ? Number(row.bathrooms)   : undefined,
                  finishing:        row.finishing,
                  unitStatus:       row.unitStatus,
                  deliveryDate:     row.deliveryDate,
                  executingCompany: row.executingCompany,
                  paperworkStatus:  row.paperworkStatus,

                  // ── الأسعار والسداد ──
                  askingPrice:          row.askingPrice          ? Number(row.askingPrice)          : undefined,
                  installmentAmount:    row.installmentAmount    ? Number(row.installmentAmount)    : undefined,
                  installmentRemaining: row.installmentRemaining ? Number(row.installmentRemaining) : undefined,
                  installmentDetails:   row.installmentDetails,
                  budgetMin:            row.budgetMin ? Number(row.budgetMin) : undefined,
                  budgetMax:            row.budgetMax ? Number(row.budgetMax) : undefined,

                  // ── بيانات مخصصة ──
                  customData: row.customData,
                })),
              }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
              totalInserted   += Number(data.count      || 0);
              totalDuplicates += Number(data.duplicates || 0);
              totalCoOwners   += Number(data.coOwners   || 0);
              totalReview     += Number(data.review     || 0);
              totalFailed     += Number(data.failed     || 0);
              success = true;
            } else if (res.status === 409) {
              retryCount++;
              setExecutionStatusText(`⏳ هناك عملية استيراد أخرى قيد التنفيذ، جاري إعادة المحاولة تلقائياً بعد ثانيتين (محاولة ${retryCount} من 3)...`);
              await new Promise(r => setTimeout(r, 2000));
            } else {
              totalFailed += currentBatch.length;
              console.error('Batch error:', data);
              success = true; // انتقل إلى الدفعة التالية
            }
          } catch {
            retryCount++;
            setExecutionStatusText(`⚠️ ضعف في الاتصال، جاري إعادة المحاولة...`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!success) {
          totalFailed += currentBatch.length;
        }
      }

      setExecutionProgress(100);
      setExecutionStatusText(totalFailed ? 'اكتمل التنفيذ مع وجود سجلات أو دفعات فاشلة؛ راجع الملخص.' : '✅ اكتمل حفظ الدفعات بنجاح.');
      setExecutionResults({
        inserted:   totalInserted,
        duplicates: totalDuplicates,
        coOwners:   totalCoOwners,
        review:     totalReview,
        failed:     totalFailed,
      });
      onImported();
    } catch (err) {
      console.error('Import execution fatal error:', err);
      setExecutionStatusText('❌ حدث خطأ غير متوقع أثناء الاستيراد.');
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
              {fileSizeWarning && (
                <div style={{
                  marginTop: 16, padding: "12px 16px", borderRadius: 10,
                  background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.4)",
                  color: "var(--gold-primary)", fontSize: 13, textAlign: "right", lineHeight: 1.6
                }}>
                  {fileSizeWarning}
                </div>
              )}
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
              onResetAutoMapping={(newMapping) =>
                handleUpdateSheetConfig(activeSheetName, { columnMapping: newMapping })
              }
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

                <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>
                    {executionResults.coOwners.toLocaleString("ar-EG")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>ملكية مشتركة</div>
                </div>

                <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#c084fc" }}>
                    {executionResults.review.toLocaleString("ar-EG")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>يحتاج مراجعة</div>
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

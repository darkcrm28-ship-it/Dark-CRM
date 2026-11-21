"use client";

import React, { useState, useMemo } from "react";

export interface PreviewRow {
  _rowNumber: number;
  _sheetName: string;
  name: string;
  phone: string;
  nationalId?: string;
  email?: string;
  type?: string;
  status?: string;
  source?: string;
  projectId?: string;
  projectName?: string;
  unitNumber?: string;
  buildingNumber?: string;
  zoneNumber?: string;
  floor?: string;
  area?: string;
  governorate?: string;
  city?: string;
  propertyType?: string;
  unitSize?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  finishing?: string;
  unitStatus?: string;
  deliveryDate?: string;
  executingCompany?: string;
  paperworkStatus?: string;
  askingPrice?: string | number;
  installmentAmount?: string | number;
  installmentRemaining?: string | number;
  installmentDetails?: string;
  budgetMin?: string | number;
  budgetMax?: string | number;
  customerType?: string;
  leadScore?: string | number;
  customData?: Record<string, any>;
  _errors: string[];
  _warnings?: string[];
  _suspectPrecision?: boolean;
}

interface PreviewStepProps {
  rows: PreviewRow[];
  activeSheetName: string;
  sheetNames: string[];
  onSelectSheet: (sheetName: string) => void;
}

export default function PreviewStep({
  rows,
  activeSheetName,
  sheetNames,
  onSelectSheet,
}: PreviewStepProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "VALID" | "INVALID">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 100;

  // إحصائيات الورقة المعروضة حالياً
  const currentSheetRows = useMemo(() => {
    return rows.filter(r => r._sheetName === activeSheetName);
  }, [rows, activeSheetName]);

  const stats = useMemo(() => {
    const total = currentSheetRows.length;
    const valid = currentSheetRows.filter(r => !r._errors?.length).length;
    const invalid = total - valid;
    const withWarnings = currentSheetRows.filter(r => (r._warnings?.length || 0) > 0).length;
    return { total, valid, invalid, withWarnings };
  }, [currentSheetRows]);

  // تصفية الصفوف
  const filteredRows = useMemo(() => {
    if (filterMode === "VALID") return currentSheetRows.filter(r => !r._errors?.length);
    if (filterMode === "INVALID") return currentSheetRows.filter(r => (r._errors?.length || 0) > 0);
    return currentSheetRows;
  }, [currentSheetRows, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const displayedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  return (
    <div>
      {/* Sheet Tabs if multi-sheet */}
      {sheetNames.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, alignSelf: "center", color: "var(--gold-primary)", marginLeft: 8 }}>
            معاينة الورقة:
          </span>
          {sheetNames.map((sName) => (
            <button
              key={sName}
              type="button"
              onClick={() => {
                onSelectSheet(sName);
                setPage(1);
              }}
              className={activeSheetName === sName ? "btn btn-primary" : "btn btn-ghost"}
              style={{ fontSize: 12, padding: "6px 14px", height: 32 }}
            >
              📄 {sName}
            </button>
          ))}
        </div>
      )}

      {/* Stats Summary Bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        padding: "12px 18px", marginBottom: 16, borderRadius: 10,
        background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)"
      }}>
        {/* Filter Badges */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => { setFilterMode("ALL"); setPage(1); }}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: filterMode === "ALL" ? "2px solid var(--text-primary)" : "1px solid var(--border)",
              background: filterMode === "ALL" ? "rgba(255,255,255,0.1)" : "transparent",
              color: "var(--text-primary)"
            }}
          >
            📋 الكل ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => { setFilterMode("VALID"); setPage(1); }}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: filterMode === "VALID" ? "2px solid var(--accent-green)" : "1px solid rgba(34,197,94,0.3)",
              background: filterMode === "VALID" ? "rgba(34,197,94,0.15)" : "transparent",
              color: "var(--accent-green)"
            }}
          >
            ✅ صالحة للاستيراد ({stats.valid})
          </button>
          <button
            type="button"
            onClick={() => { setFilterMode("INVALID"); setPage(1); }}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: filterMode === "INVALID" ? "2px solid var(--accent-red)" : "1px solid rgba(239,68,68,0.3)",
              background: filterMode === "INVALID" ? "rgba(239,68,68,0.15)" : "transparent",
              color: "var(--accent-red)"
            }}
          >
            ⚠️ تحتاج مراجعة ({stats.invalid})
          </button>
        </div>

        {/* Pagination info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
          <span>
            عرض الصفوف {((page - 1) * pageSize) + 1} إلى {Math.min(page * pageSize, filteredRows.length)} من أصل {filteredRows.length}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn btn-ghost"
              style={{ padding: "4px 8px", height: 28, fontSize: 12 }}
            >
              السابق
            </button>
            <span style={{ alignSelf: "center", fontWeight: 700, padding: "0 6px" }}>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="btn btn-ghost"
              style={{ padding: "4px 8px", height: 28, fontSize: 12 }}
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
        maxHeight: 440, overflowY: "auto"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 1 }}>
              {["# صف", "حالة الفحص", "الاسم", "رقم الهاتف", "الرقم القومي", "الوحدة", "العمارة", "المشروع", "السعر", "المساحة", "النوع / الحالة", "تاريخ الاستلام"].map(h => (
                <th key={h} style={{ padding: "10px 10px", textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  لا توجد صفوف تطابق عامل التصفية المحدد
                </td>
              </tr>
            ) : (
              displayedRows.map((row, idx) => {
                const hasError = (row._errors?.length || 0) > 0;
                const hasWarning = (row._warnings?.length || 0) > 0;

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: hasError ? "rgba(239,68,68,0.04)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"
                    }}
                  >
                    <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontWeight: 700 }}>
                      {row._rowNumber}
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 800 }}>
                      {hasError ? (
                        <span style={{ color: "var(--accent-red)" }}>
                          ❌ {row._errors.join(" • ")}
                        </span>
                      ) : hasWarning ? (
                        <span style={{ color: "var(--gold-primary)" }}>
                          ⚠️ {row._warnings?.join(" • ")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--accent-green)" }}>
                          ✅ سليم
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 800, color: "var(--text-primary)" }}>
                      {row.name || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", direction: "ltr", textAlign: "right" }}>
                      {row.phone || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.nationalId || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.unitNumber || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.buildingNumber || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.projectName || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.askingPrice || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.unitSize || row.area || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>
                        {row.type || "SELLER"} - {row.status || "POTENTIAL_SELLER"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.deliveryDate || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

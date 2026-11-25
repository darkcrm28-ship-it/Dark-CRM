"use client";

import { useRef, useState } from "react";
import type { DocumentEntityType } from "@/lib/document-access";
import { ACCESS_LABELS, DOCUMENT_TYPE_OPTIONS, formatSize, TYPE_LABELS } from "@/lib/document-ui";
import { useEntityDocuments } from "@/lib/use-entity-documents";

export default function EntityDocumentsPanel({
  entityType,
  entityId,
  canManage,
  canManagePrivileged = false,
  currentUserId,
  title = "المستندات والصور",
}: {
  entityType: DocumentEntityType;
  entityId: string;
  canManage: boolean;
  canManagePrivileged?: boolean;
  currentUserId?: string;
  title?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("IDENTIFICATION");
  const [docTitle, setDocTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState("RESTRICTED");
  const { documents, loading, busy, message, upload, download, remove } = useEntityDocuments(
    entityType,
    entityId
  );

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const uploaded = await upload({ file, type: documentType, title: docTitle, accessLevel });
    if (uploaded) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDocTitle("");
    }
  };

  return (
    <div dir="rtl" className="card animate-in" style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>📎 {title}</h2>

      {canManage && entityId && (
        <form onSubmit={handleUpload} className="grid-2" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">الملف (PDF / JPG / PNG / DOCX — حتى 5MB)</label>
            <input
              ref={fileInputRef}
              className="input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">نوع المستند</label>
            <select
              className="input"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              {DOCUMENT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">العنوان (اختياري)</label>
            <input
              className="input"
              value={docTitle}
              onChange={(event) => setDocTitle(event.target.value)}
              placeholder="مثال: بطاقة الرقم القومي"
            />
          </div>
          <div className="form-group">
            <label className="form-label">مستوى الوصول</label>
            <select
              className="input"
              value={accessLevel}
              onChange={(event) => setAccessLevel(event.target.value)}
            >
              {Object.entries(ACCESS_LABELS)
                .filter(([value]) => canManagePrivileged || value !== "CONFIDENTIAL")
                .map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 2", textAlign: "left" }}>
            <button className="btn btn-primary" type="submit" disabled={busy || !file}>
              {busy ? "جارٍ الرفع..." : "رفع المستند"}
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className="card animate-in" style={{ marginBottom: 16, color: "var(--accent-orange)" }}>
          {message}
        </div>
      )}

      {loading ? (
        <p className="page-subtitle">جارٍ التحميل...</p>
      ) : documents.length === 0 ? (
        <p className="page-subtitle">لا توجد مستندات مسجلة بعد.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>النوع</th>
              <th>الوصول</th>
              <th>الحجم</th>
              <th>تاريخ الرفع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td title={doc.fileName}>{doc.title || doc.fileName}</td>
                <td>{TYPE_LABELS[doc.type] || doc.type}</td>
                <td>{ACCESS_LABELS[doc.accessLevel] || doc.accessLevel}</td>
                <td>{formatSize(doc.sizeBytes)}</td>
                <td dir="ltr" style={{ textAlign: "right" }}>
                  {new Date(doc.createdAt).toLocaleDateString("ar-EG")}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => download(doc.id)}
                      disabled={busy}
                    >
                      تحميل
                    </button>
                    {canManage && (canManagePrivileged || doc.uploadedById === currentUserId) && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => remove(doc.id)}
                        disabled={busy}
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

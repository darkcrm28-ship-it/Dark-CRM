"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCESS_LABELS, DOCUMENT_TYPE_OPTIONS, formatSize, TYPE_LABELS } from "@/lib/document-ui";
import { useEntityDocuments } from "@/lib/use-entity-documents";

type Option = { id: string; label: string };

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: "PROPERTY", label: "عقار" },
  { value: "CUSTOMER", label: "عميل" },
  { value: "DEAL", label: "صفقة" },
  { value: "OWNER", label: "مالك" },
  { value: "PROPERTY_OWNER", label: "علاقة ملكية" },
  { value: "RESERVATION", label: "حجز" },
  { value: "CONTRACT", label: "عقد" },
  { value: "PAYMENT", label: "دفعة" },
  { value: "INSTALLMENT", label: "قسط" },
];

const ENTITY_LABELS: Record<string, string> = Object.fromEntries(
  ENTITY_TYPES.map((item) => [item.value, item.label])
);

export default function DocumentsClient({
  entities,
  initialEntityType,
  initialEntityId,
  canManage,
  canManagePrivileged = false,
  currentUserId,
}: {
  entities: Record<string, Option[]>;
  initialEntityType: string;
  initialEntityId: string;
  canManage: boolean;
  canManagePrivileged?: boolean;
  currentUserId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entityType, setEntityType] = useState(
    ENTITY_TYPES.some((item) => item.value === initialEntityType) ? initialEntityType : "PROPERTY"
  );
  const [entityId, setEntityId] = useState(initialEntityId);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("OTHER");
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState("RESTRICTED");
  const { documents, loading, busy, message, upload, download, remove } = useEntityDocuments(
    entityType,
    entityId
  );

  const options = entities[entityType];
  const hasPicker = Array.isArray(options);

  const changeEntityType = (value: string) => {
    setEntityType(value);
    setEntityId("");
    const params = new URLSearchParams();
    params.set("entityType", value);
    router.replace(`/dashboard/documents?${params.toString()}`);
  };

  const changeEntityId = (value: string) => {
    setEntityId(value);
    const params = new URLSearchParams();
    params.set("entityType", entityType);
    if (value) params.set("entityId", value);
    router.replace(`/dashboard/documents?${params.toString()}`);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const uploaded = await upload({ file, type: documentType, title, accessLevel });
    if (uploaded) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTitle("");
    }
  };

  return (
    <div dir="rtl">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">المستندات</h1>
          <p className="page-subtitle">
            رفع وتنظيم المستندات الخاصة في ImageKit مع روابط تحميل موقّعة ومحدّدة المدة.
          </p>
        </div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">نوع الكيان</label>
            <select
              className="input"
              value={entityType}
              onChange={(event) => changeEntityType(event.target.value)}
            >
              {ENTITY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">الكيان</label>
            {hasPicker ? (
              <select
                className="input"
                value={entityId}
                onChange={(event) => changeEntityId(event.target.value)}
              >
                <option value="">— اختر —</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={entityId}
                onChange={(event) => changeEntityId(event.target.value)}
                placeholder="معرّف الكيان"
                dir="ltr"
              />
            )}
          </div>
        </div>
      </div>

      {canManage && entityId && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>إضافة مستند</h2>
          <form onSubmit={handleUpload} className="grid-2">
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
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: عقد البيع النهائي"
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
        </div>
      )}

      {message && (
        <div className="card animate-in" style={{ marginBottom: 16, color: "var(--accent-orange)" }}>
          {message}
        </div>
      )}

      <div className="card animate-in">
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>
          مستندات {entityId ? ENTITY_LABELS[entityType] : ""}
        </h2>
        {!entityId ? (
          <p className="page-subtitle">اختر كياناً لعرض مستنداته.</p>
        ) : loading ? (
          <p className="page-subtitle">جارٍ التحميل...</p>
        ) : documents.length === 0 ? (
          <p className="page-subtitle">لا توجد مستندات لهذا الكيان.</p>
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
    </div>
  );
}

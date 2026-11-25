"use client";

import { useState } from "react";

type OwnerLink = {
  id: string;
  percentage: string;
  property: { id: string; title: string | null; unitNumber: string | null; projectName: string | null };
};
type OwnerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  type: string;
  address: string | null;
  notes: string | null;
  createdAt: string;
  properties: OwnerLink[];
};
type PropertyOption = { id: string; label: string };
type LinkRow = {
  id: string;
  propertyId: string;
  ownerId: string;
  percentage: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  notes: string | null;
  owner: { id: string; name: string; phone: string | null };
};
type ShareDraft = { ownerId: string; percentage: string };

const OWNER_TYPES = [
  { value: "INDIVIDUAL", label: "فرد" },
  { value: "COMPANY", label: "شركة" },
  { value: "GOVERNMENT", label: "جهة حكومية" },
  { value: "OTHER", label: "أخرى" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  OWNER_TYPES.map((item) => [item.value, item.label])
);

const EMPTY_OWNER = {
  name: "",
  phone: "",
  email: "",
  nationalId: "",
  type: "INDIVIDUAL",
  address: "",
  notes: "",
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "تعذّر إتمام العملية");
  return data as T;
}

export default function PropertyOwnersClient({
  initialOwners,
  propertyOptions,
  initialLinks,
  canWrite,
}: {
  initialOwners: OwnerRow[];
  propertyOptions: PropertyOption[];
  initialLinks: LinkRow[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<"owners" | "split">("owners");
  const [owners, setOwners] = useState(initialOwners);
  const [links, setLinks] = useState(initialLinks);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_OWNER });
  const [selectedProperty, setSelectedProperty] = useState(propertyOptions[0]?.id || "");
  const [shares, setShares] = useState<ShareDraft[]>([]);
  const [splitNotes, setSplitNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const reload = async () => {
    const [ownerData, linkData] = await Promise.all([
      api<{ owners: OwnerRow[] }>(`/api/owners?limit=200&q=${encodeURIComponent(query)}`),
      selectedProperty
        ? api<{ owners: LinkRow[] }>(`/api/properties/${selectedProperty}/owners`)
        : Promise.resolve({ owners: [] as LinkRow[] }),
    ]);
    setOwners(ownerData.owners);
    setLinks((current) => {
      const others = current.filter((link) => link.propertyId !== selectedProperty);
      return [...others, ...linkData.owners];
    });
  };

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await reload();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذّر إتمام العملية");
    } finally {
      setBusy(false);
    }
  };

  const submitOwner = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (editingId) {
        await api(`/api/owners/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await api("/api/owners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setForm({ ...EMPTY_OWNER });
      setEditingId(null);
      setShowForm(false);
    }, editingId ? "تم تعديل المالك." : "تم إضافة المالك.");
  };

  const editOwner = (owner: OwnerRow) => {
    setEditingId(owner.id);
    setForm({
      name: owner.name,
      phone: owner.phone || "",
      email: owner.email || "",
      nationalId: owner.nationalId || "",
      type: owner.type,
      address: owner.address || "",
      notes: owner.notes || "",
    });
    setShowForm(true);
  };

  const deleteOwner = (id: string) => {
    if (!window.confirm("هل تريد حذف هذا المالك؟")) return;
    void run(async () => {
      await api(`/api/owners/${id}`, { method: "DELETE" });
    }, "تم حذف المالك.");
  };

  const selectProperty = (propertyId: string) => {
    setSelectedProperty(propertyId);
    const current = links.filter((link) => link.propertyId === propertyId);
    setShares(current.map((link) => ({ ownerId: link.ownerId, percentage: link.percentage })));
    setSplitNotes(current[0]?.notes || "");
  };

  const total = shares.reduce((sum, share) => sum + (Number(share.percentage) || 0), 0);
  const roundedTotal = Math.round(total * 100) / 100;

  const saveSplit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProperty) return;
    if (shares.length === 0) {
      setMessage("أضف مالكاً واحداً على الأقل.");
      return;
    }
    const ownerIds = shares.map((share) => share.ownerId);
    if (ownerIds.some((id) => !id) || new Set(ownerIds).size !== ownerIds.length) {
      setMessage("كل مالك يجب أن يظهر مرة واحدة فقط.");
      return;
    }
    if (shares.some((share) => !(Number(share.percentage) > 0) || Number(share.percentage) > 100)) {
      setMessage("النسب يجب أن تكون بين 0 و100.");
      return;
    }
    if (roundedTotal !== 100) {
      setMessage(`مجموع النسب يجب أن يساوي 100% (الحالي: ${roundedTotal}%).`);
      return;
    }

    void run(async () => {
      await api(`/api/properties/${selectedProperty}/owners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owners: shares.map((share) => ({
            ownerId: share.ownerId,
            percentage: share.percentage,
          })),
          notes: splitNotes,
        }),
      });
    }, "تم حفظ توزيع الملكية.");
  };

  const currentLinks = links.filter((link) => link.propertyId === selectedProperty);

  return (
    <div dir="rtl">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">الملاك والملكية</h1>
          <p className="page-subtitle">
            إدارة الملاك المستقلين وتوزيع ملكية الوحدات بنسب دقيقة مجموعها 100%.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={tab === "owners" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("owners")}
          >
            الملاك ({owners.length})
          </button>
          <button
            className={tab === "split" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("split")}
          >
            توزيع الملكية ({links.length})
          </button>
        </div>
      </div>

      {message && <div className="card animate-in" style={{ marginBottom: 16 }}>{message}</div>}

      {tab === "owners" ? (
        <>
          <div className="card animate-in" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <input
                className="input"
                style={{ maxWidth: 360 }}
                placeholder="بحث بالاسم أو الهاتف أو الرقم القومي"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => void reload()}
              />
              {canWrite && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...EMPTY_OWNER });
                    setShowForm((value) => !value);
                  }}
                >
                  {showForm ? "إغلاق" : "+ مالك جديد"}
                </button>
              )}
            </div>
          </div>

          {canWrite && showForm && (
            <div className="card animate-in" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, marginBottom: 16 }}>{editingId ? "تعديل مالك" : "مالك جديد"}</h2>
              <form onSubmit={submitOwner} className="grid-2">
                <div className="form-group">
                  <label className="form-label">الاسم *</label>
                  <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">الهاتف</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">الرقم القومي</label>
                  <input className="input" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">النوع</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {OWNER_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">العنوان</label>
                  <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">ملاحظات</label>
                  <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div style={{ gridColumn: "span 2", textAlign: "left" }}>
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    {editingId ? "حفظ التعديل" : "إضافة"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card animate-in">
            {owners.length === 0 ? (
              <p className="page-subtitle">لا يوجد ملاك مسجّلون.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>الرقم القومي</th>
                    <th>النوع</th>
                    <th>وحداته</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id}>
                      <td>{owner.name}</td>
                      <td dir="ltr" style={{ textAlign: "right" }}>{owner.phone || "—"}</td>
                      <td dir="ltr" style={{ textAlign: "right" }}>{owner.nationalId || "—"}</td>
                      <td>{TYPE_LABELS[owner.type] || owner.type}</td>
                      <td>{owner.properties.length}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {canWrite && (
                            <>
                              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => editOwner(owner)}>تعديل</button>
                              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => deleteOwner(owner.id)}>حذف</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card animate-in" style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label className="form-label">الوحدة</label>
              <select className="input" value={selectedProperty} onChange={(e) => selectProperty(e.target.value)}>
                <option value="">— اختر وحدة —</option>
                {propertyOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedProperty && (
            <>
              <div className="card animate-in" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, marginBottom: 16 }}>الملكية الحالية</h2>
                {currentLinks.length === 0 ? (
                  <p className="page-subtitle">لا توجد ملكية مسجّلة لهذه الوحدة.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr><th>المالك</th><th>النسبة</th><th>من تاريخ</th></tr>
                    </thead>
                    <tbody>
                      {currentLinks.map((link) => (
                        <tr key={link.id}>
                          <td>{link.owner.name}</td>
                          <td>{Number(link.percentage).toLocaleString("ar-EG")}%</td>
                          <td dir="ltr" style={{ textAlign: "right" }}>{new Date(link.effectiveFrom).toLocaleDateString("ar-EG")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {canWrite && (
                <div className="card animate-in">
                  <h2 style={{ fontSize: 16, marginBottom: 16 }}>توزيع جديد</h2>
                  <form onSubmit={saveSplit}>
                    {shares.map((share, index) => (
                      <div className="grid-2" key={`${share.ownerId}-${index}`} style={{ marginBottom: 10 }}>
                        <div className="form-group">
                          <label className="form-label">المالك</label>
                          <select
                            className="input"
                            value={share.ownerId}
                            onChange={(e) => {
                              const next = [...shares];
                              next[index] = { ...share, ownerId: e.target.value };
                              setShares(next);
                            }}
                          >
                            <option value="">— اختر —</option>
                            {owners.map((owner) => (
                              <option key={owner.id} value={owner.id}>{owner.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">النسبة %</label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              className="input"
                              inputMode="decimal"
                              value={share.percentage}
                              onChange={(e) => {
                                const next = [...shares];
                                next[index] = { ...share, percentage: e.target.value };
                                setShares(next);
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setShares(shares.filter((_, i) => i !== index))}
                            >
                              إزالة
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">ملاحظات (اختياري)</label>
                      <input className="input" value={splitNotes} onChange={(e) => setSplitNotes(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShares([...shares, { ownerId: "", percentage: "" }])}
                      >
                        + إضافة مالك
                      </button>
                      <span style={{ color: roundedTotal === 100 ? "var(--accent-green)" : "var(--accent-orange)" }}>
                        المجموع: {roundedTotal.toLocaleString("ar-EG")}%
                      </span>
                      <button type="submit" className="btn btn-primary" disabled={busy || shares.length === 0}>
                        حفظ التوزيع
                      </button>
                    </div>
                    <p className="page-subtitle" style={{ marginTop: 10 }}>
                      الحفظ يغلق التوزيع الحالي ويبدأ توزيعاً جديداً في نفس الـ transaction.
                    </p>
                  </form>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

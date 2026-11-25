"use client";

import { useCallback, useState } from "react";

type Option = { id: string; label: string };

type RelatedUnit = {
  id: string;
  title: string | null;
  projectName: string | null;
  unitNumber: string | null;
  status: string;
};
type RelatedCustomer = { id: string; name: string; phone: string | null };

type ReservationRow = {
  id: string;
  propertyId: string;
  customerId: string;
  dealId: string | null;
  status: string;
  startAt: string;
  endAt: string;
  amount: string;
  currency: string;
  notes: string | null;
  property: RelatedUnit | null;
  customer: RelatedCustomer | null;
};

type ContractRow = {
  id: string;
  dealId: string | null;
  reservationId: string | null;
  customerId: string;
  propertyId: string;
  type: string;
  status: string;
  signedAt: string | null;
  terms: Record<string, unknown> | null;
  documentKey: string | null;
  property: RelatedUnit | null;
  customer: RelatedCustomer | null;
  deal: { id: string; status: string; finalPrice: number | null } | null;
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "حجز قيد الانتظار",
  APPROVED: "حجز معتمد",
  RELEASED: "محرر",
  EXPIRED: "منتهي",
  CONVERTED: "محول لعقد",
  CANCELLED: "ملغي",
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "عقد مسودة",
  PENDING_APPROVAL: "عقد بانتظار الاعتماد",
  APPROVED: "عقد معتمد",
  SIGNED: "عقد موقّع",
  REJECTED: "عقد مرفوض",
  CANCELLED: "عقد ملغي",
  TERMINATED: "عقد منهي",
};

function unitLabel(unit: RelatedUnit | null): string {
  if (!unit) return "—";
  return `${unit.title || unit.projectName || "وحدة"}${unit.unitNumber ? ` - ${unit.unitNumber}` : ""}`;
}

function money(value: string | number | null | undefined): string {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString("ar-EG") : "0";
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "تعذّر إتمام العملية");
  return data as T;
}

export default function DealCycleClient({
  propertyOptions,
  customerOptions,
  reservationOptions,
  initialReservations,
  initialContracts,
  canWrite,
  canApprove,
}: {
  propertyOptions: Option[];
  customerOptions: Option[];
  reservationOptions: Option[];
  initialReservations: ReservationRow[];
  initialContracts: ContractRow[];
  canWrite: boolean;
  canApprove: boolean;
}) {
  const [reservations, setReservations] = useState(initialReservations);
  const [contracts, setContracts] = useState(initialContracts);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [reservationForm, setReservationForm] = useState({
    propertyId: "",
    customerId: "",
    startAt: "",
    endAt: "",
    amount: "",
    notes: "",
  });
  const [contractForm, setContractForm] = useState({
    customerId: "",
    propertyId: "",
    reservationId: "",
    type: "SALE",
    finalPrice: "",
    value: "",
    commission: "",
  });

  const reload = useCallback(async () => {
    const [reservationData, contractData] = await Promise.all([
      api<{ reservations: ReservationRow[] }>("/api/reservations"),
      api<{ contracts: ContractRow[] }>("/api/contracts"),
    ]);
    setReservations(reservationData.reservations);
    setContracts(contractData.contracts);
  }, []);

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

  const changeReservationStatus = (id: string, status: string, needsReason: boolean) => {
    void run(async () => {
      const reason = needsReason ? (window.prompt("سبب تغيير حالة الحجز:", "") ?? "") : "";
      await api(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
    }, status === "APPROVED" ? "تم اعتماد الحجز." : "تم تحديث حالة الحجز.");
  };

  const submitReservation = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reservationForm,
          startAt: new Date(reservationForm.startAt).toISOString(),
          endAt: new Date(reservationForm.endAt).toISOString(),
        }),
      });
      setReservationForm({ propertyId: "", customerId: "", startAt: "", endAt: "", amount: "", notes: "" });
    }, "تم إنشاء الحجز.");
  };

  const submitContract = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: contractForm.customerId,
          propertyId: contractForm.propertyId,
          reservationId: contractForm.reservationId || null,
          type: contractForm.type,
          terms: {
            finalPrice: Number(contractForm.finalPrice) || 0,
            value: Number(contractForm.value || contractForm.finalPrice) || 0,
            commission: Number(contractForm.commission) || 0,
          },
        }),
      });
      setContractForm({ customerId: "", propertyId: "", reservationId: "", type: "SALE", finalPrice: "", value: "", commission: "" });
    }, "تم إنشاء العقد.");
  };

  const changeContractStatus = (id: string, status: string, needsReason: boolean) => {
    void run(async () => {
      const reason = needsReason ? (window.prompt("سبب تغيير حالة العقد:", "") ?? "") : "";
      const docKey = status === "SIGNED" ? (window.prompt("رابط مستند العقد النهائي (اختياري):", "") ?? "") : undefined;
      await api(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason, documentKey: docKey }),
      });
    }, status === "SIGNED" ? "تم توقيع العقد وإنشاء الصفقة تلقائياً." : "تم تحديث حالة العقد.");
  };

  return (
    <div dir="rtl">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">غرفة الصفقات — دورة واحدة من العميل حتى الإغلاق</h1>
          <p className="page-subtitle">
            كل الإجراءات في تاب واحد: حجز → عقد → توقيع → صفقة مغلقة مع العمولة والقيمة ومستند العقد.
          </p>
        </div>
      </div>

      {message && <div className="card animate-in" style={{ marginBottom: 16 }}>{message}</div>}

      {canWrite && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>بدء دورة جديدة — حجز</h2>
          <form onSubmit={submitReservation} className="grid-2">
            <div className="form-group">
              <label className="form-label">الوحدة</label>
              <select className="input" required value={reservationForm.propertyId} onChange={(e) => setReservationForm({ ...reservationForm, propertyId: e.target.value })}>
                <option value="">— اختر —</option>
                {propertyOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">العميل</label>
              <select className="input" required value={reservationForm.customerId} onChange={(e) => setReservationForm({ ...reservationForm, customerId: e.target.value })}>
                <option value="">— اختر —</option>
                {customerOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">من</label>
              <input className="input" type="datetime-local" required value={reservationForm.startAt} onChange={(e) => setReservationForm({ ...reservationForm, startAt: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">إلى</label>
              <input className="input" type="datetime-local" required value={reservationForm.endAt} onChange={(e) => setReservationForm({ ...reservationForm, endAt: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">مبلغ الحجز (اختياري)</label>
              <input className="input" inputMode="decimal" value={reservationForm.amount} onChange={(e) => setReservationForm({ ...reservationForm, amount: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <input className="input" value={reservationForm.notes} onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })} />
            </div>
            <div style={{ gridColumn: "span 2", textAlign: "left" }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>إنشاء حجز</button>
            </div>
          </form>
        </div>
      )}

      {canWrite && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>عقد جديد</h2>
          <form onSubmit={submitContract} className="grid-2">
            <div className="form-group">
              <label className="form-label">العميل</label>
              <select className="input" required value={contractForm.customerId} onChange={(e) => setContractForm({ ...contractForm, customerId: e.target.value, reservationId: "" })}>
                <option value="">— اختر —</option>
                {customerOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">الوحدة</label>
              <select className="input" required value={contractForm.propertyId} onChange={(e) => setContractForm({ ...contractForm, propertyId: e.target.value, reservationId: "" })}>
                <option value="">— اختر —</option>
                {propertyOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">حجز معتمد (اختياري)</label>
              <select className="input" value={contractForm.reservationId} onChange={(e) => setContractForm({ ...contractForm, reservationId: e.target.value })}>
                <option value="">— بدون حجز —</option>
                {reservationOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">نوع العقد</label>
              <select className="input" value={contractForm.type} onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })}>
                <option value="SALE">بيع</option>
                <option value="RENT">إيجار</option>
                <option value="PRELIMINARY">مبدئي</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">السعر النهائي</label>
              <input className="input" inputMode="decimal" required value={contractForm.finalPrice} onChange={(e) => setContractForm({ ...contractForm, finalPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">قيمة العقد (اختياري)</label>
              <input className="input" inputMode="decimal" value={contractForm.value} onChange={(e) => setContractForm({ ...contractForm, value: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">نسبة العمولة %</label>
              <input className="input" inputMode="decimal" value={contractForm.commission} onChange={(e) => setContractForm({ ...contractForm, commission: e.target.value })} />
            </div>
            <div style={{ gridColumn: "span 2", textAlign: "left" }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>إنشاء عقد</button>
            </div>
          </form>
        </div>
      )}

      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>الحجوزات</h2>
        {reservations.length === 0 ? (
          <p className="page-subtitle">لا توجد حجوزات.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الوحدة</th>
                <th>العميل</th>
                <th>الحالة</th>
                <th>المدة</th>
                <th>المبلغ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((row) => (
                <tr key={row.id}>
                  <td>{unitLabel(row.property)}</td>
                  <td>{row.customer?.name || "—"}</td>
                  <td>{RESERVATION_STATUS_LABELS[row.status] || row.status}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>
                    {new Date(row.startAt).toLocaleDateString("ar-EG")} — {new Date(row.endAt).toLocaleDateString("ar-EG")}
                  </td>
                  <td>{money(row.amount)} {row.currency}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {canWrite && row.status === "PENDING" && (
                        <>
                          {canApprove && (
                            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => changeReservationStatus(row.id, "APPROVED", true)}>
                              اعتماد
                            </button>
                          )}
                          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => changeReservationStatus(row.id, "CANCELLED", true)}>
                            إلغاء
                          </button>
                        </>
                      )}
                      {canApprove && row.status === "APPROVED" && (
                        <>
                          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => changeReservationStatus(row.id, "RELEASED", true)}>
                            تحرير
                          </button>
                          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => changeReservationStatus(row.id, "EXPIRED", true)}>
                            انتهاء
                          </button>
                          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => changeReservationStatus(row.id, "CONVERTED", true)}>
                            تحويل لعقد
                          </button>
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

      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>العقود والصفقات</h2>
        {contracts.length === 0 ? (
          <p className="page-subtitle">لا توجد عقود.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الوحدة</th>
                <th>العميل</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>القيمة</th>
                <th>الصفقة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((row) => {
                const terms = row.terms || {};
                return (
                  <tr key={row.id}>
                    <td>{unitLabel(row.property)}</td>
                    <td>{row.customer?.name || "—"}</td>
                    <td>{row.type}</td>
                    <td>{CONTRACT_STATUS_LABELS[row.status] || row.status}</td>
                    <td>{money(terms.finalPrice as string | number | undefined)}</td>
                    <td>{row.deal ? <span style={{ color: "var(--accent-green)" }}>مغلقة</span> : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {canWrite && row.status === "DRAFT" && (
                          <>
                            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "PENDING_APPROVAL", false)}>
                              تقديم
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "CANCELLED", true)}>
                              إلغاء
                            </button>
                          </>
                        )}
                        {canApprove && row.status === "PENDING_APPROVAL" && (
                          <>
                            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "APPROVED", false)}>
                              اعتماد
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "REJECTED", true)}>
                              رفض
                            </button>
                          </>
                        )}
                        {canApprove && row.status === "APPROVED" && (
                          <>
                            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "SIGNED", false)}>
                              توقيع وإنشاء الصفقة
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "CANCELLED", true)}>
                              إلغاء
                            </button>
                          </>
                        )}
                        {canApprove && row.status === "SIGNED" && (
                          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => changeContractStatus(row.id, "TERMINATED", true)}>
                            إنهاء العقد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EntityDocumentsPanel from "@/components/EntityDocumentsPanel";

// ─── Shared Toast (same pattern as CustomersClient) ───────────────────────────
type ToastType = "success" | "error" | "info" | "warning";
interface Toast { id: number; type: ToastType; message: string; hiding?: boolean; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}${t.hiding ? " hiding" : ""}`}
          onClick={() => onDismiss(t.id)}
        >
          <span>{t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "ℹ️"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const show = useCallback((message: string, type: ToastType = "success", duration = 3500) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, hiding: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
    }, duration);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, hiding: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
  }, []);
  return { toasts, show, dismiss };
}
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "POTENTIAL_SELLER", label: "بائع محتمل",        badge: "badge-orange" },
  { value: "BUYER",            label: "مشتري",             badge: "badge-green" },
  { value: "SELLER",           label: "بائع",              badge: "badge-blue" },
  { value: "RENTER",           label: "مستأجر",            badge: "badge-blue" },
  { value: "CALL_LATER",       label: "اتصال في وقت لاحق", badge: "badge-purple" },
  { value: "NO_ANSWER",        label: "لا يرد",            badge: "badge-orange" },
  { value: "NOT_INTERESTED",   label: "غير مهتم",          badge: "badge-red" },
  { value: "DO_NOT_SELL",      label: "لا يرغب في البيع", badge: "badge-red" },
  { value: "LANDLORD",         label: "مؤجر",              badge: "badge-purple" },
  { value: "COMPLETED",        label: "مكتمل",             badge: "badge-gold" },
];

const INTERACTION_ICONS: Record<string, string> = { CALL: "📞", VIEWING: "🏠", NOTE: "📝" };
const INTERACTION_LABELS: Record<string, string> = { CALL: "مكالمة هاتفية", VIEWING: "موعد معاينة", NOTE: "ملاحظة عامة" };

export default function CustomerDetailsClient({
  initialCustomer,
  canManageDocuments = false,
  canManagePrivilegedDocuments = false,
  currentUserId,
}: {
  initialCustomer: any;
  currentUser?: any;
  canManageDocuments?: boolean;
  canManagePrivilegedDocuments?: boolean;
  currentUserId?: string;
}) {
  const [customer] = useState(initialCustomer);
  const [status, setStatus] = useState(initialCustomer.status);
  const [askingPrice, setAskingPrice] = useState(initialCustomer.askingPrice || "");
  const [remainingInstallments, setRemainingInstallments] = useState(initialCustomer.remainingInstallments || "");
  const [installmentDuration, setInstallmentDuration] = useState(initialCustomer.installmentDuration || "");
  const [interactionType, setInteractionType] = useState("CALL");
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [governorate, setGovernorate] = useState(initialCustomer.governorate || "");
  const [city, setCity] = useState(initialCustomer.city || "");
  const [executingCompany, setExecutingCompany] = useState(initialCustomer.executingCompany || "");
  const [deliveryDate, setDeliveryDate] = useState(initialCustomer.deliveryDate || "");
  const [floor, setFloor] = useState(initialCustomer.floor || "");
  const [bedrooms, setBedrooms] = useState(initialCustomer.bedrooms || "");
  const [bathrooms, setBathrooms] = useState(initialCustomer.bathrooms || "");
  const [finishing, setFinishing] = useState(initialCustomer.finishing || "");
  const [preferencesSummary, setPreferencesSummary] = useState(initialCustomer.preferencesSummary || "");
  const [unitStatus, setUnitStatus] = useState(initialCustomer.unitStatus || "");
  const [isNegotiable, setIsNegotiable] = useState(initialCustomer.isNegotiable || false);
  const [viewingTimes, setViewingTimes] = useState(initialCustomer.viewingTimes || "");
  const [paperworkStatus, setPaperworkStatus] = useState(initialCustomer.paperworkStatus || "");
  const [customData, setCustomData] = useState<any>(initialCustomer.customData || {});
  const [leadScore, setLeadScore] = useState(initialCustomer.leadScore || 3);
  const [matchingUnits, setMatchingUnits] = useState<any[]>([]);
  const [showMatching, setShowMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const router = useRouter();

  const waPhone = customer.phone.replace(/\D/g, "").startsWith("0")
    ? "2" + customer.phone.replace(/\D/g, "")
    : customer.phone.replace(/\D/g, "");

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          askingPrice: askingPrice ? parseFloat(askingPrice) : null,
          remainingInstallments: remainingInstallments ? parseFloat(remainingInstallments) : null,
          installmentDuration: installmentDuration ? parseInt(installmentDuration) : null,
          governorate, city, executingCompany, deliveryDate, floor, finishing, preferencesSummary,
          unitStatus, isNegotiable, viewingTimes, paperworkStatus,
          leadScore,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseInt(bathrooms) : null,
          customData
        }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      showToast("تم حفظ التغييرات بنجاح", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الحفظ", "error");
    } finally { setLoading(false); }
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: interactionType, notes, reminderDate: reminderDate || undefined }),
      });
      if (!res.ok) throw new Error("فشل إضافة المتابعة");
      setNotes("");
      setReminderDate("");
      showToast("تمت إضافة المتابعة بنجاح", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الإضافة", "error");
    } finally { setLoading(false); }
  };

  const handleFetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${customer.city || customer.governorate || ""}&priceMax=${customer.budgetMax || 99999999}`);
      if (res.ok) {
        const data = await res.json();
        setMatchingUnits(data);
        setShowMatching(true);
      }
    } catch {
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Back + Header */}
      <div className="animate-in" style={{ marginBottom: 20 }}>
        <Link href="/dashboard/customers" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          → رجوع للعملاء
        </Link>
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 900, color: "#000", flexShrink: 0,
              boxShadow: "var(--shadow-glow)"
            }}>{customer.name?.charAt(0)}</div>
            <div>
              <div className="page-title">{customer.name}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                {/* Phone with copy + WhatsApp */}
                <span className="badge badge-blue" style={{ direction: "ltr", cursor: "pointer" }}
                  title="انقر لنسخ الرقم"
                  onClick={() => { navigator.clipboard.writeText(customer.phone); showToast("تم نسخ الرقم", "info", 2000); }}
                >{customer.phone}</span>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-wa"
                  title="تواصل عبر واتساب"
                >
                  💬 واتساب
                </a>

                {/* Lead Score Stars */}
                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={async () => {
                        setLeadScore(s);
                        await fetch(`/api/customers/${customer.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ leadScore: s }),
                        });
                        showToast(`تم تعيين التقييم ${s} نجوم`, "success", 2000);
                        router.refresh();
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 18, color: s <= leadScore ? "var(--gold-primary)" : "var(--text-muted)" }}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <Link href={`/share/unit/${customer.id}`} target="_blank" className="btn btn-secondary btn-sm">
                  📤 بروفايل الوحدة
                </Link>

                {customer.type === "BUYER" && (
                  <button onClick={handleFetchMatches} className="btn btn-primary btn-sm">
                    🔍 مطابقة الوحدات المتاحة
                  </button>
                )}

                {customer.projectName && <span className="badge badge-gray">{customer.projectName}</span>}
                {customer.source && <span className="badge badge-purple">🎯 المصدر: {customer.source}</span>}
                <span className={`badge ${currentStatus?.badge || "badge-gray"}`}>{currentStatus?.label || customer.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMatching && (
        <div className="card animate-in" style={{ marginBottom: 24, border: "1px solid var(--gold-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800 }}>🤖 وحدات مقترحة لهذا المشتري</h3>
            <button onClick={() => setShowMatching(false)} className="btn btn-ghost btn-sm">إغلاق</button>
          </div>
          <div className="grid-3">
            {matchingUnits.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: "span 3" }}>لا توجد وحدات مطابقة حالياً.</div>
            ) : (
              matchingUnits.map((u: any) => (
                <div key={u.id} className="card" style={{ background: "rgba(212,175,55,0.05)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{u.title || u.projectName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{u.zone} — {u.unitNumber}</div>
                  <div style={{ color: "var(--accent-green)", fontWeight: 800, marginBottom: 12 }}>{u.price?.toLocaleString()} جنيه</div>
                  <Link href={`/dashboard/properties`} className="btn btn-secondary btn-sm btn-full">معاينة العقار ←</Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Info Cards Row */}
      <div className="grid-2 animate-in-1" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: "var(--gold-primary)", borderBottom: "1px solid rgba(212,175,55,0.1)", paddingBottom: 8 }}>
            🏠 بيانات الوحدة / العقار المسجلة
          </div>
          <div className="grid-2" style={{ gap: "12px 24px" }}>
            <div style={{ fontSize: 13 }}>📍 المنطقة: <strong>{customer.area || customer.zoneNumber || "—"}</strong></div>
            <div style={{ fontSize: 13 }}>🏗️ المشروع: <strong>{customer.project?.name || customer.projectName || "—"}</strong></div>
            <div style={{ fontSize: 13 }}>🏢 رقم العمارة: <strong>{customer.buildingNumber || "—"}</strong></div>
            <div style={{ fontSize: 13 }}>🔑 رقم الوحدة: <strong>{customer.unitNumber || "—"}</strong></div>
            <div style={{ fontSize: 13 }}>📏 المساحة: <strong>{customer.unitSize ? `${customer.unitSize} م²` : "—"}</strong></div>
            <div style={{ fontSize: 13 }}>🛏️ الغرف: <strong>{customer.bedrooms || "—"}</strong> | 🛁 الحمامات: <strong>{customer.bathrooms || "—"}</strong></div>
            <div style={{ fontSize: 13 }}>🛋️ التشطيب: <strong>{customer.finishing || "—"}</strong></div>
            {customer.askingPrice && (
              <div style={{ fontSize: 13 }}>💰 السعر المطلوب: <strong style={{ color: "var(--accent-green)" }}>{customer.askingPrice.toLocaleString()} جنيه</strong></div>
            )}
            {customer.customData?.leaseDuration && (
              <div style={{ fontSize: 13 }}>⏳ مدة الإيجار: <strong>{customer.customData.leaseDuration}</strong></div>
            )}
            {customer.customData?.paymentMethod && (
              <div style={{ fontSize: 13 }}>💳 نظام الدفع: <strong>{customer.customData.paymentMethod === "CASH" ? "كاش" : customer.customData.paymentMethod === "INSTALLMENTS" ? "تقسيط" : "لا يهم"}</strong></div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: "var(--accent-blue)", borderBottom: "1px solid rgba(59,130,246,0.1)", paddingBottom: 8 }}>
            📝 ملخص الطلب / الملاحظات العامة
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
            {customer.preferencesSummary || (customer.interactions?.find((i: any) => i.type === "NOTE")?.notes) || "لا توجد ملاحظات عامة مسجلة بعد."}
          </div>
        </div>
      </div>

      <div className="grid-2 animate-in-2">
        {/* Left: Status Update */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔄</span> تحديث حالة العميل
            </div>
            <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group">
                <label className="form-label">الحالة الحالية</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {["WANTS_TO_SELL", "SELLER", "POTENTIAL_SELLER", "LANDLORD"].includes(status) && (
                <div style={{
                  background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
                  borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column", gap: 12
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-blue)" }}>
                    📋 بيانات البيع الإضافية
                  </div>
                  <div className="form-group">
                    <label className="form-label">السعر المطلوب (جنيه)</label>
                    <input type="number" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} className="input" placeholder="مثال: 1,500,000" />
                  </div>
                  {status === "LANDLORD" && (
                    <div className="form-group">
                      <label className="form-label">مدة الإيجار المتاحة</label>
                      <input type="text" value={customData?.leaseDuration || ""} onChange={(e) => setCustomData({...customData, leaseDuration: e.target.value})} className="input" placeholder="مثال: سنة, 6 شهور..." />
                    </div>
                  )}
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">الأقساط المتبقية</label>
                      <input type="number" value={remainingInstallments} onChange={(e) => setRemainingInstallments(e.target.value)} className="input" placeholder="القيمة الكلية" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">المدة (بالشهور)</label>
                      <input type="number" value={installmentDuration} onChange={(e) => setInstallmentDuration(e.target.value)} className="input" placeholder="مثال: 36" />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">المحافظة</label>
                      <input type="text" value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">المدينة</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الشركة المنفذة</label>
                      <input type="text" value={executingCompany} onChange={(e) => setExecutingCompany(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">تاريخ الاستلام</label>
                      <input type="text" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">عدد الغرف</label>
                      <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">عدد الحمامات</label>
                      <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الدور</label>
                      <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">التشطيب</label>
                      <select value={finishing} onChange={(e) => setFinishing(e.target.value)} className="input">
                        <option value="">اختر...</option>
                        <option value="خام">خام</option>
                        <option value="نصف تشطيب">نصف تشطيب</option>
                        <option value="تشطيب كامل">تشطيب كامل</option>
                        <option value="سوبر لوكس">سوبر لوكس</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">حالة الإشغال</label>
                      <select value={unitStatus} onChange={(e) => setUnitStatus(e.target.value)} className="input">
                        <option value="">اختر...</option>
                        <option value="VACANT">شاغرة (متاحة)</option>
                        <option value="RENTED">مؤجرة</option>
                        <option value="OCCUPIED">مشغولة (مالك)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 25 }}>
                      <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} id="isNegotiable" />
                      <label htmlFor="isNegotiable" className="form-label" style={{ marginBottom: 0 }}>قابل للتفاوض</label>
                    </div>
                    <div className="form-group">
                      <label className="form-label">مواعيد المعاينة المتاحة</label>
                      <input type="text" value={viewingTimes} onChange={(e) => setViewingTimes(e.target.value)} className="input" placeholder="مثلاً: يومياً بعد 5" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">حالة أوراق الشقة (تفاصيل إضافية)</label>
                    <textarea value={paperworkStatus} onChange={(e) => setPaperworkStatus(e.target.value)} className="input" rows={2} placeholder="مثلاً: مسجلة شهر عقاري، صحة توقيع..." />
                  </div>
                </div>
              )}

              {customer.type === "BUYER" && (
                <div style={{
                  background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
                  borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column", gap: 12
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-green)" }}>
                    🔍 بيانات رغبات المشتري
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">المحافظة المفضلة</label>
                      <input type="text" value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">المدينة / المنطقة المفضلة</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الأدوار المرغوبة (مرن)</label>
                      <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)} className="input" placeholder="مثال: أرضي أو أول" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">مستوى التشطيب المطلوب</label>
                      <input type="text" value={finishing} onChange={(e) => setFinishing(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">نظام الدفع المفضل</label>
                      <select value={customData?.paymentMethod || ""} onChange={(e) => setCustomData({...customData, paymentMethod: e.target.value})} className="input">
                        <option value="">اختر النظام...</option>
                        <option value="CASH">كاش فقط</option>
                        <option value="INSTALLMENTS">تقسيط</option>
                        <option value="ANY">لا يهم (حسب العرض)</option>
                      </select>
                    </div>
                    {status === "RENTER" && (
                      <div className="form-group">
                        <label className="form-label">مدة الإيجار المطلوبة</label>
                        <input type="text" value={customData?.leaseDuration || ""} onChange={(e) => setCustomData({...customData, leaseDuration: e.target.value})} className="input" placeholder="مثال: سنتين، 6 أشهر..." />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملخص الرغبات الكاملة</label>
                    <textarea 
                      value={preferencesSummary} onChange={(e) => setPreferencesSummary(e.target.value)} 
                      className="input" rows={3} placeholder="أي تفاصيل إضافية عن متطلبات العميل..." 
                    />
                  </div>
                </div>
              )}

              {/* Show seller data if already set */}
              {customer.askingPrice && status !== "WANTS_TO_SELL" && (
                <div className="card card-gold" style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold-primary)", marginBottom: 8 }}>💰 بيانات البيع المسجلة</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    <span>السعر: <strong>{customer.askingPrice?.toLocaleString()} جنيه</strong></span>
                    {customer.remainingInstallments && <span>الأقساط: <strong>{customer.remainingInstallments?.toLocaleString()}</strong></span>}
                    {customer.installmentDuration && <span>المدة: <strong>{customer.installmentDuration} شهر</strong></span>}
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
              </button>
            </form>
          </div>

          {/* Add Interaction */}
          <div className="card">
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>➕</span> تسجيل متابعة جديدة
            </div>
            <form onSubmit={handleAddInteraction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {["CALL", "VIEWING", "NOTE"].map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setInteractionType(t)}
                    className={`btn btn-sm ${interactionType === t ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1 }}
                  >
                    {INTERACTION_ICONS[t]} {INTERACTION_LABELS[t]}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">التفاصيل والملاحظات</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="input" rows={3} required
                  placeholder={
                    interactionType === "CALL" ? "ماذا دار في المكالمة؟ هل العميل مهتم؟..."
                    : interactionType === "VIEWING" ? "تفاصيل المعاينة، موعدها، ملاحظات العميل..."
                    : "اكتب ملاحظتك هنا..."
                  }
                  style={{ resize: "vertical", minHeight: 80 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">جدولة تنبيه أو موعد (اختياري)</label>
                <input 
                  type="datetime-local" 
                  value={reminderDate} 
                  onChange={(e) => setReminderDate(e.target.value)} 
                  className="input" 
                />
              </div>
              <button type="submit" disabled={loading || !notes.trim()} className="btn btn-secondary">
                {loading ? "..." : `${INTERACTION_ICONS[interactionType]} تسجيل المتابعة`}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📋 سجل المتابعات</span>
            <span className="badge badge-gray">{customer.interactions?.length || 0} متابعة</span>
          </div>

          {!customer.interactions?.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">لا توجد متابعات بعد. ابدأ بتسجيل أول مكالمة أو ملاحظة.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {customer.interactions.map((interaction: any) => (
                <div key={interaction.id} className="timeline-item">
                  <div className="timeline-dot" style={{ fontSize: 16 }}>{INTERACTION_ICONS[interaction.type] || "📌"}</div>
                  <div className="timeline-content">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <span className={`badge badge-sm ${interaction.type === "CALL" ? "badge-blue" : interaction.type === "VIEWING" ? "badge-gold" : "badge-gray"}`} style={{ fontSize: 10, marginBottom: 4 }}>
                          {INTERACTION_LABELS[interaction.type]}
                        </span>
                        <div className="timeline-title" style={{ marginTop: 4 }}>{interaction.notes}</div>
                      </div>
                    </div>
                    <div className="timeline-time" style={{ marginTop: 6 }}>
                      🕐 {new Date(interaction.createdAt).toLocaleString("ar-EG")} — بواسطة: <strong>{interaction.user?.name}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EntityDocumentsPanel
        entityType="CUSTOMER"
        entityId={customer.id}
        canManage={canManageDocuments}
        canManagePrivileged={canManagePrivilegedDocuments}
        currentUserId={currentUserId}
        title={`مستندات وصور العميل: ${customer.name || ""}`}
      />
    </div>
  );
}

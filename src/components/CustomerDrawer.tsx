"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DynamicFields from "./DynamicFields";

export default function CustomerDrawer({ customer, isOpen, onClose, projects, onUpdated }: any) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(customer?.status || "");
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [customData, setCustomData] = useState<any>(customer?.customData || {});
  const [followUpDate, setFollowUpDate] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      const fetchDefs = async () => {
        const res = await fetch("/api/settings/custom-fields");
        const data = await res.json();
        setCustomFieldDefs(data.filter((f: any) => f.entityType === "CUSTOMER"));
      };
      fetchDefs();
      setStatus(customer?.status || "");
      setCustomData(customer?.customData || {});
      setNotes("");
    }
  }, [isOpen, customer]);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
      alert("متصفحك لا يدعم خاصية الإملاء الصوتي.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setNotes(prev => prev + (prev ? " " : "") + text);
    };
    recognition.start();
  };

  if (!isOpen || !customer) return null;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, customData, followUpDate }),
      });
      
      if (notes.trim()) {
        await fetch(`/api/customers/${customer.id}/interactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "NOTE", notes }),
        });
      }
      
      if (onUpdated) {
        onUpdated({ ...customer, status, customData, lastInteractionAt: new Date().toISOString() });
      } else {
        router.refresh();
      }
      onClose();
    } catch (err) {}
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{customer.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{customer.phone}</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 20 }}>✕</button>
        </div>
        
        <div className="drawer-body">
          <div className="form-group">
            <label className="form-label">تحديث الحالة</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="BUYER">مشتري</option>
              <option value="POTENTIAL_SELLER">بائع محتمل</option>
              <option value="SELLER">بائع</option>
              <option value="RENTER">مستأجر</option>
              <option value="CALL_LATER">اتصال في وقت لاحق</option>
              <option value="NO_ANSWER">لا يرد</option>
              <option value="NOT_INTERESTED">غير مهتم</option>
              <option value="DO_NOT_SELL">لا يرغب في البيع</option>
              <option value="COMPLETED">مكتمل</option>
            </select>
          </div>

          {status === "CALL_LATER" && (
            <div className="form-group animate-in" style={{ marginTop: 12, padding: 12, background: "rgba(212, 175, 55, 0.1)", borderRadius: 8 }}>
              <label className="form-label" style={{ color: "var(--gold-primary)" }}>⏰ تحديد موعد الاتصال القادم</label>
              <input 
                type="datetime-local" 
                value={followUpDate} 
                onChange={e => setFollowUpDate(e.target.value)} 
                className="input"
              />
            </div>
          )}

          <div className="form-group" style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label">إضافة ملاحظة سريعة</label>
              <button 
                type="button" 
                onClick={startListening} 
                className={`btn btn-ghost btn-sm ${isListening ? "animate-pulse" : ""}`}
                style={{ color: isListening ? "var(--accent-red)" : "var(--gold-primary)", border: "none" }}
              >
                {isListening ? "🔴 جاري الاستماع..." : "🎤 إملاء صوتي"}
              </button>
            </div>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="input" 
              rows={4} 
              placeholder="اكتب تفاصيل المتابعة الأخيرة هنا..."
            />
          </div>

          <div style={{ marginTop: 24, padding: 16, background: "rgba(212,175,55,0.05)", borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>💎 معلومات الوحدة</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>المنطقة: {customer.area || "—"}</div>
              <div>المشروع: {customer.projectName || "—"}</div>
              <div>رقم العمارة: {customer.buildingNumber || "—"}</div>
              <div>رقم الوحدة: {customer.unitNumber || "—"}</div>
            </div>
          </div>

          <DynamicFields 
            entityType="CUSTOMER" 
            definitions={customFieldDefs} 
            values={customData} 
            onChange={(name, val) => setCustomData({...customData, [name]: val})} 
          />
        </div>

        <div className="drawer-footer">
          <button onClick={handleUpdate} disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
            {loading ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
          </button>
          <button onClick={onClose} className="btn btn-ghost">إلغاء</button>
        </div>
      </div>
    </>
  );
}

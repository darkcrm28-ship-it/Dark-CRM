"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    serviceType: "CONSULTATION",
    preferredZone: "",
    budget: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryType: formData.serviceType,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          preferredZone: formData.preferredZone.trim(),
          budget: formData.budget.trim(),
          notes: formData.notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ أثناء إرسال الطلب");

      setSuccess(true);
      setFormData({
        name: "",
        phone: "",
        email: "",
        serviceType: "CONSULTATION",
        preferredZone: "",
        budget: "",
        notes: "",
      });
    } catch (err: any) {
      setError(err.message || "فشل إرسال الطلب، يرجى المحاولة لاحقاً أو مراسلتنا عبر واتساب.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="public-portal-root">
      <PublicHeader />

      {/* Header Banner */}
      <section className="contact-page-hero">
        <div className="portal-container text-center">
          <div className="section-tag mb-4">مركز الاستشارات وخدمة العملاء</div>
          <h1 className="portfolio-main-heading">
            تواصل معنا مباشرة، خطوتك الأولى نحو <span className="gold-shimmer-text">قرار عقاري مدروس</span>
          </h1>
          <p className="portfolio-subheading">
            سواء كنت ترغب في استشارة استثمارية، تحديد موعد معاينة ميدانية، أو الاستفسار عن تفاصيل وحدة؛ مستشارونا في خدمتك.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="portal-container mb-24">
        <div className="contact-main-grid-layout">
          {/* Contact Details & Cards */}
          <div className="contact-cards-column">
            <h2 className="contact-column-title">قنوات التواصل المباشرة</h2>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              اختر القناة الأنسب لك للتواصل مع مسؤولي خدمة العملاء والمستشارين الماليين.
            </p>

            <div className="contact-direct-cards-list">
              {/* Phone Card */}
              <div className="contact-direct-card">
                <div className="direct-card-icon gold">
                  <Phone size={22} />
                </div>
                <div>
                  <div className="direct-card-label">الاتصال الهاتفي المباشر</div>
                  <div className="direct-card-val" dir="ltr">+20 100 000 0000</div>
                  <div className="direct-card-sub">متاح السبت إلى الخميس: 10:00 ص &ndash; 8:00 م</div>
                </div>
              </div>

              {/* WhatsApp Card */}
              <a
                href="https://wa.me/?text=مرحباً شركة دارك العقارية، أود الاستفسار عن الخدمات والوحدات المتاحة."
                target="_blank"
                rel="noopener noreferrer"
                className="contact-direct-card hover-glow"
              >
                <div className="direct-card-icon green">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <div className="direct-card-label">المحادثة الفورية عبر واتساب</div>
                  <div className="direct-card-val text-green-400">بدء محادثة الآن &larr;</div>
                  <div className="direct-card-sub">رد سريع على مدار اليوم</div>
                </div>
              </a>

              {/* Location Card */}
              <div className="contact-direct-card">
                <div className="direct-card-icon blue">
                  <MapPin size={22} />
                </div>
                <div>
                  <div className="direct-card-label">المقر الرئيسي للشركة</div>
                  <div className="direct-card-val">التجمع الخامس، القاهرة الجديدة</div>
                  <div className="direct-card-sub">محافظة القاهرة &bull; جمهورية مصر العربية</div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="contact-direct-card">
                <div className="direct-card-icon purple">
                  <Clock size={22} />
                </div>
                <div>
                  <div className="direct-card-label">أيام وساعات العمل</div>
                  <div className="direct-card-val">السبت إلى الخميس: 10:00 ص إلى 8:00 م</div>
                  <div className="direct-card-sub">الجمعة: إجازة أسبوعية لفريق المبيعات</div>
                </div>
              </div>
            </div>

            <div className="privacy-reassurance-box mt-6">
              <ShieldCheck size={20} className="text-gold shrink-0" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong>التزام بالسرية:</strong> بياناتك الهاتفية والشخصية تستخدم حصرياً للتواصل معك بخصوص طلبك ولا يتم مشاركتها مطلقاً مع أي طرف ثالث.
              </div>
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="contact-form-column">
            <div className="dedicated-contact-form-card">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-gold" />
                <h3 className="form-card-title-lg">نموذج حجز الاستشارة والاستفسار</h3>
              </div>
              <p className="text-xs text-muted mb-6">
                املأ النموذج التالي وسيقوم أحد مستشارينا بالتواصل معك هاتفياً أو عبر واتساب خلال ساعات قليلة.
              </p>

              {success && (
                <div className="form-alert-success mb-6 p-4">
                  <CheckCircle2 size={20} className="shrink-0" />
                  <div>
                    <div className="font-bold">تم استلام طلبك بنجاح!</div>
                    <div className="text-xs mt-1">سيتواصل معك أحد مستشارينا المتخصصين في أقرب وقت.</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="form-alert-error mb-6 p-4">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="portal-quick-form">
                <div className="form-field">
                  <label>نوع الطلب أو الخدمة *</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="portal-input"
                  >
                    <option value="CONSULTATION">حجز جلسة استشارة عقارية مجانية</option>
                    <option value="VIEWING">طلب معاينة وحدة معروضة بالكتالوج</option>
                    <option value="CONTACT">استفسار عام أو سؤال عن مشروع محدد</option>
                  </select>
                </div>

                <div className="grid-2-form gap-4">
                  <div className="form-field">
                    <label>الاسم بالكامل * (إلزامي)</label>
                    <input
                      type="text"
                      required
                      placeholder="اسمك الكريم..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="portal-input"
                    />
                  </div>

                  <div className="form-field">
                    <label>رقم الهاتف / الواتساب * (إلزامي)</label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="portal-input"
                    />
                  </div>
                </div>

                <div className="grid-2-form gap-4">
                  <div className="form-field">
                    <label>المنطقة أو الكومباوند المهتم به</label>
                    <input
                      type="text"
                      placeholder="مثال: التجمع، الشيخ زايد، العاصمة..."
                      value={formData.preferredZone}
                      onChange={(e) => setFormData({ ...formData, preferredZone: e.target.value })}
                      className="portal-input"
                    />
                  </div>

                  <div className="form-field">
                    <label>الميزانية التقريبية (جنيه مصري)</label>
                    <input
                      type="text"
                      placeholder="مثال: 5,000,000 أو كاش / قسط"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="portal-input"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>ملاحظات إضافية أو وقت الاتصال المفضل</label>
                  <textarea
                    rows={4}
                    placeholder="اكتب أي تفاصيل بخصوص طلبك، مواصفات الوحدة التي تبحث عنها، أو أفضل وقت للاتصال..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="portal-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-consultation-gold w-full justify-center py-3.5 text-base mt-2"
                >
                  {loading ? "جاري الإرسال..." : "تأكيد وإرسال الطلب الآن"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

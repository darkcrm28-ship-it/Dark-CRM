"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Home,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  Lock,
  EyeOff,
  UserCheck,
  Sparkles,
} from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import UnitImageManager from "@/components/UnitImageManager";

export default function SellClient() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    unitType: "شقة",
    projectName: "",
    zone: "",
    area: "",
    price: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    notes: "",
    images: [] as string[],
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
      const payload = {
        inquiryType: "SELL_UNIT",
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        unitType: formData.unitType,
        projectName: formData.projectName.trim(),
        preferredZone: formData.zone.trim(),
        area: formData.area.trim(),
        price: formData.price.trim(),
        floor: formData.floor.trim(),
        bedrooms: formData.bedrooms.trim(),
        bathrooms: formData.bathrooms.trim(),
        notes: formData.notes.trim(),
        images: formData.images,
      };

      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال بيانات الوحدة");

      setSuccess(true);
      setFormData({
        name: "",
        phone: "",
        email: "",
        unitType: "شقة",
        projectName: "",
        zone: "",
        area: "",
        price: "",
        floor: "",
        bedrooms: "",
        bathrooms: "",
        notes: "",
        images: [],
      });
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إرسال البيانات، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="public-portal-root">
      <PublicHeader />

      {/* Hero Section */}
      <section className="sell-page-hero">
        <div className="portal-container text-center">
          <div className="section-tag gold mb-4">بوابة ملاك العقارات والوحدات</div>
          <h1 className="portfolio-main-heading">
            اعرض وحدتك للبيع بأعلى عائد استثماري وبـ <span className="gold-shimmer-text">سرية تامة</span>
          </h1>
          <p className="portfolio-subheading">
            نقوم بتسويق وحدتك لقاعدة مشترين جادة ومؤهلة مع حماية مطلقة لخصوصيتك: لا إفصاح عن رقم الوحدة أو العمارة أو هاتفك في العلن.
          </p>
        </div>
      </section>

      {/* Security Guarantees Bar */}
      <section className="portal-container mb-16">
        <div className="sell-guarantees-grid">
          <div className="guarantee-box">
            <EyeOff size={24} className="text-gold mb-3" />
            <h3 className="guarantee-title">حجب العنوان الدقيق</h3>
            <p className="guarantee-desc">نعرض فقط اسم المشروع والمنطقة التقريبية؛ لا نظهر رقم العمارة أو الشقة حفاظاً على هدوئك وخصوصيتك.</p>
          </div>

          <div className="guarantee-box">
            <UserCheck size={24} className="text-gold mb-3" />
            <h3 className="guarantee-title">تصفية المشترين الجادين</h3>
            <p className="guarantee-desc">يقوم مستشارونا بالتحقق المالي من جدية كل مشتري ومطابقة ميزانيته قبل ترتيب أي موعد معاينة ميدانية.</p>
          </div>

          <div className="guarantee-box">
            <Lock size={24} className="text-gold mb-3" />
            <h3 className="guarantee-title">أمان تعاقدي وقانوني</h3>
            <p className="guarantee-desc">إشراف قانوني كامل على صياغة عقود البيع وحسابات سداد الأقساط والتنازل بالشركة المطورة.</p>
          </div>
        </div>
      </section>

      {/* Sell Form Container */}
      <section className="portal-container mb-24">
        <div className="sell-form-wrapper-card">
          <div className="sell-form-header">
            <div className="flex items-center gap-2 mb-1">
              <Home size={20} className="text-gold" />
              <h2 className="text-xl font-extrabold text-white">تسجيل مواصفات الوحدة المعروضة للبيع</h2>
            </div>
            <p className="text-xs text-muted">
              يرجى إدخال أكبر قدر ممكن من التفاصيل لتمكين فريقنا من تقييم الوحدة وتسويقها بأسرع وقت.
            </p>
          </div>

          {success && (
            <div className="form-alert-success my-6 p-4">
              <CheckCircle2 size={22} className="shrink-0" />
              <div>
                <div className="font-extrabold text-base">تم تسجيل وحدتك بنجاح لدى شركة دارك!</div>
                <div className="text-xs mt-1">سيتواصل معك أحد مديري المبيعات خلال 24 ساعة لبدء خطة التسويق بعد مراجعة البيانات.</div>
              </div>
            </div>
          )}

          {error && (
            <div className="form-alert-error my-6 p-4">
              <AlertCircle size={22} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="portal-quick-form mt-6">
            {/* Step 1: Owner Info */}
            <h3 className="form-section-divider-title">1. بيانات التواصل مع المالك (سرية تماماً)</h3>
            <div className="grid-3-form gap-4">
              <div className="form-field">
                <label>اسم المالك بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="الاسم الرباعي..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>رقم هاتف المالك *</label>
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

              <div className="form-field">
                <label>البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            {/* Step 2: Unit Specs */}
            <h3 className="form-section-divider-title mt-6">2. مواصفات وموقع الوحدة</h3>
            <div className="grid-3-form gap-4">
              <div className="form-field">
                <label>نوع العقار *</label>
                <select
                  value={formData.unitType}
                  onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                  className="portal-input"
                >
                  <option value="شقة">شقة سكنية</option>
                  <option value="فيلا">فيلا مستقلة</option>
                  <option value="توين هاوس">توين هاوس</option>
                  <option value="تاون هاوس">تاون هاوس</option>
                  <option value="دوبلكس">دوبلكس</option>
                  <option value="بنتهاوس">بنتهاوس</option>
                  <option value="مكتب إداري">مكتب إداري</option>
                  <option value="محل تجاري">محل تجاري</option>
                </select>
              </div>

              <div className="form-field">
                <label>اسم المشروع / الكومباوند *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مدينتي، ميفيدا، بالم هيلز..."
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>المنطقة / الحي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: التجمع الخامس، زايد، أكتوبر..."
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            <div className="grid-4-form gap-4 mt-2">
              <div className="form-field">
                <label>المساحة (م²) *</label>
                <input
                  type="number"
                  required
                  placeholder="مثال: 165"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>الدور / الطابق</label>
                <input
                  type="text"
                  placeholder="مثال: الدور الثالث"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>عدد الغرف</label>
                <input
                  type="number"
                  placeholder="مثال: 3"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>عدد الحمامات</label>
                <input
                  type="number"
                  placeholder="مثال: 2"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            {/* Step 3: Financials */}
            <h3 className="form-section-divider-title mt-6">3. السعر ونظام السداد المطلوب</h3>
            <div className="grid-2-form gap-4">
              <div className="form-field">
                <label>السعر المطلوب الإجمالي (جنيه مصري) *</label>
                <input
                  type="number"
                  required
                  placeholder="مثال: 4,500,000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>تفاصيل السداد أو الأقساط المتبقية</label>
                <input
                  type="text"
                  placeholder="مثال: كاش بالكامل أو مقدم 2 مليون والباقي أقساط..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            {/* Step 4: Images */}
            <h3 className="form-section-divider-title mt-6">4. صور الوحدة (حتى 10 صور)</h3>
            <div className="images-uploader-wrap mb-4">
              <UnitImageManager
                images={formData.images}
                onChange={(imgs) => setFormData({ ...formData, images: imgs })}
                maxImages={10}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-consultation-gold w-full justify-center py-4 text-base font-extrabold mt-6"
            >
              {loading ? "جاري تسجيل الوحدة ورفع البيانات..." : "تأكيد تسجيل الوحدة للبيع الآن"}
            </button>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

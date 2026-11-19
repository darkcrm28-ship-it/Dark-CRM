"use client";

import React, { useState } from "react";
import {
  Building2,
  Calendar,
  Eye,
  Home,
  MessageCircle,
  PhoneCall,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Maximize2,
  BedDouble,
  Bath,
  Search,
  ChevronDown,
} from "lucide-react";
import UnitImageManager from "@/components/UnitImageManager";

interface PropertyItem {
  id: string;
  title?: string | null;
  projectName?: string | null;
  zone?: string | null;
  unitType?: string | null;
  size?: number | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  images?: string | null;
  monthlyInstallment?: number | null;
}

export default function PublicPortalClient({
  featuredProperties = [],
}: {
  featuredProperties: PropertyItem[];
}) {
  const [activeTab, setActiveTab] = useState<"NONE" | "CONSULTATION" | "VIEWING" | "SELL_UNIT" | "CONTACT">("NONE");
  const [selectedPropertyForViewing, setSelectedPropertyForViewing] = useState<PropertyItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    preferredZone: "",
    budget: "",
    notes: "",
    // For Sell Property:
    unitType: "شقة",
    area: "",
    price: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    images: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      preferredZone: "",
      budget: "",
      notes: "",
      unitType: "شقة",
      area: "",
      price: "",
      floor: "",
      bedrooms: "",
      bathrooms: "",
      images: [],
    });
    setSuccessMessage("");
    setErrorMessage("");
  };

  const openModal = (tab: "CONSULTATION" | "VIEWING" | "SELL_UNIT" | "CONTACT", property?: PropertyItem) => {
    resetForm();
    if (property) {
      setSelectedPropertyForViewing(property);
      setFormData((prev) => ({
        ...prev,
        preferredZone: property.zone || "",
        notes: `طلب معاينة للوحدة في مشروع: ${property.projectName || ""}`,
      }));
    } else {
      setSelectedPropertyForViewing(null);
    }
    setActiveTab(tab);
  };

  const closeModal = () => {
    setActiveTab("NONE");
    setSelectedPropertyForViewing(null);
    resetForm();
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        inquiryType: activeTab,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        preferredZone: formData.preferredZone,
        budget: formData.budget,
        notes: formData.notes,
        unitType: formData.unitType,
        area: formData.area,
        price: formData.price,
        floor: formData.floor,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        images: formData.images,
        propertyId: selectedPropertyForViewing?.id,
      };

      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ أثناء إرسال الطلب");

      setSuccessMessage(data.message || "تم استلام طلبكم بنجاح! سيتواصل معكم أحد مستشارينا قريباً.");
      setTimeout(() => {
        if (activeTab !== "NONE") {
          // Keep success message visible briefly
        }
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "فشل إرسال الطلب، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const parseCover = (imagesStr?: string | null): string | null => {
    if (!imagesStr) return null;
    try {
      const arr = JSON.parse(imagesStr);
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
    } catch {
      return imagesStr;
    }
    return null;
  };

  return (
    <div dir="rtl" className="public-portal-root">
      {/* Background Ambience */}
      <div className="portal-ambient-glow orb-gold" />
      <div className="portal-ambient-glow orb-blue" />

      {/* ─── 1. TOP NAVBAR (NO LOGIN LINKS) ─── */}
      <header className="portal-navbar">
        <div className="portal-container nav-container">
          <div className="portal-brand">
            <div className="portal-brand-logo">
              <Building2 size={24} className="text-gold" />
            </div>
            <div>
              <div className="portal-brand-title">
                <span className="gold-gradient-text">دارك</span> للاستثمار العقاري
              </div>
              <div className="portal-brand-tagline">Darek Real Estate Consultancy</div>
            </div>
          </div>

          <nav className="portal-nav-links">
            <a href="/properties" className="portal-link font-bold text-gold">عقارات للبيع</a>
            <a href="#featured-units" className="portal-link">الوحدات المميزة</a>
            <a href="#sell-section" className="portal-link">اعرض وحدتك للبيع</a>
            <a href="#contact-section" className="portal-link">تواصل معنا</a>
          </nav>

          <div className="portal-nav-actions">
            <button
              onClick={() => openModal("CONSULTATION")}
              className="portal-consult-btn"
            >
              <Calendar size={15} />
              <span>استشارة مجانية</span>
            </button>

            <a
              href="https://wa.me/?text=مرحباً شركة دارك العقارية، أود الاستفسار عن خدماتكم والوحدات المتاحة."
              target="_blank"
              rel="noopener noreferrer"
              className="portal-whatsapp-pill"
              title="تواصل مباشر عبر واتساب"
            >
              <MessageCircle size={17} />
              <span>واتساب</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="portal-hero-section">
        <div className="portal-container hero-layout">
          <div className="hero-text-content">
            <div className="hero-pill-badge">
              <ShieldCheck size={14} className="text-gold" />
              <span>منظومة الاستثمار والتسويق العقاري الموثوقة</span>
            </div>

            <h1 className="hero-main-title">
              نختار لك أرقى <span className="gold-gradient-text">الوحدات العقارية</span> بعناية واحترافية
            </h1>

            <p className="hero-description">
              نضع بين يديك خلاصة خبرتنا في السوق العقاري المصري، لمساعدتك في شراء، استثمار، أو بيع وحدتك بأعلى عائد وبسرية وأمان تام.
            </p>

            {/* Quick Stats Banner */}
            <div className="hero-stats-row">
              <div className="stat-box">
                <div className="stat-num">+50</div>
                <div className="stat-text">مشروع حصري معتمد</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">+1,200</div>
                <div className="stat-text">عميل راضٍ ومستثمر</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">100%</div>
                <div className="stat-text">سرية ومصداقية للبيانات</div>
              </div>
            </div>
          </div>

          {/* Quick Action Interactive Cards Grid */}
          <div className="hero-action-cards-grid">
            {/* Card 1: Consultation */}
            <div onClick={() => openModal("CONSULTATION")} className="action-glass-card">
              <div className="action-icon-circle gold">
                <Calendar size={22} />
              </div>
              <h3 className="action-card-title">حجز استشارة عقارية</h3>
              <p className="action-card-desc">تحدث مباشرة مع مستشار عقاري متخصص لتحديد أنسب الفرص لميزانيتك.</p>
              <span className="action-card-btn">احجز جلستك الآن &larr;</span>
            </div>

            {/* Card 2: Viewing */}
            <div onClick={() => openModal("VIEWING")} className="action-glass-card">
              <div className="action-icon-circle emerald">
                <Eye size={22} />
              </div>
              <h3 className="action-card-title">طلب معاينة وحدة</h3>
              <p className="action-card-desc">اختر الوحدة التي تناسبك وحدد موعداً للمعاينة الميدانية برفقة فريقنا.</p>
              <span className="action-card-btn">تحديد موعد معاينة &larr;</span>
            </div>

            {/* Card 3: Sell Unit */}
            <div onClick={() => openModal("SELL_UNIT")} className="action-glass-card highlight">
              <div className="action-icon-circle blue">
                <Home size={22} />
              </div>
              <h3 className="action-card-title">اعرض وحدتك للبيع معنا</h3>
              <p className="action-card-desc">مالك لوحدة؟ سجل مواصفاتها وارفع حتى 10 صور لنصلك بأفضل المشترين الجادين.</p>
              <span className="action-card-btn gold">سجل وحدتك الآن &larr;</span>
            </div>

            {/* Card 4: Contact */}
            <div onClick={() => openModal("CONTACT")} className="action-glass-card">
              <div className="action-icon-circle purple">
                <PhoneCall size={22} />
              </div>
              <h3 className="action-card-title">استفسار وتواصل مباشر</h3>
              <p className="action-card-desc">فريق خدمة العملاء جاهز للإجابة على كافة استفساراتكم على مدار اليوم.</p>
              <span className="action-card-btn">إرسال استفسار &larr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURED UNITS SHOWCASE (STOREFRONT) ─── */}
      <section id="featured-units" className="portal-section featured-units-section">
        <div className="portal-container">
          <div className="section-head text-center">
            <span className="section-tag">معرض الكتالوجات الحصري</span>
            <h2 className="section-title-large">أحدث الوحدات العقارية المتاحة</h2>
            <p className="section-subtitle">
              تصفح مواصفات وتفاصيل الوحدات في متجرنا العقاري، مع الحفاظ التام على خصوصية العناوين والملاك
            </p>
          </div>

          <div className="properties-portal-grid">
            {featuredProperties.map((p) => {
              const cover = parseCover(p.images);
              return (
                <div key={p.id} className="portal-property-card">
                  {/* Image Cover */}
                  <div className="portal-property-cover">
                    {cover ? (
                      <img src={cover} alt={p.projectName || "وحدة عقارية"} />
                    ) : (
                      <div className="portal-property-no-img">
                        <Building2 size={40} className="text-gold opacity-40 mb-2" />
                        <span>معاينة حصرية لدى المستشار</span>
                      </div>
                    )}
                    <div className="portal-property-badge">
                      <span>{p.unitType || "شقة سكنية"}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="portal-property-body">
                    <h3 className="portal-property-title">{p.projectName || "مشروع عقاري متميز"}</h3>
                    <p className="portal-property-location">
                      <MapPin size={13} className="text-gold" />
                      <span>المنطقة: <strong>{p.zone || "القاهرة الكبرى"}</strong></span>
                    </p>

                    <div className="portal-property-specs">
                      {p.size && (
                        <span><Maximize2 size={13} /> {p.size} م²</span>
                      )}
                      {p.bedrooms && (
                        <span><BedDouble size={13} /> {p.bedrooms} غرف</span>
                      )}
                      {p.bathrooms && (
                        <span><Bath size={13} /> {p.bathrooms} حمام</span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="portal-property-price-row">
                      <div>
                        <span className="price-label">السعر المطلوب</span>
                        <div className="price-val">
                          {p.price ? `${p.price.toLocaleString()} ج.م` : "عند التواصل"}
                        </div>
                      </div>

                      {p.monthlyInstallment && (
                        <div className="installment-pill">
                          قسط: {p.monthlyInstallment.toLocaleString()} ج.م
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="portal-property-actions">
                      <a
                        href={`/share/property/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-storefront"
                      >
                        <Eye size={15} />
                        <span>معاينة تفاصيل الوحدة</span>
                      </a>

                      <button
                        onClick={() => openModal("VIEWING", p)}
                        className="btn-request-viewing"
                      >
                        <span>طلب معاينة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {featuredProperties.length === 0 && (
              <div className="empty-properties-box col-span-full">
                <Building2 size={48} className="text-gold opacity-40 mx-auto mb-3" />
                <h4 className="font-bold text-slate-200">يتم حالياً تحديث الكتالوج الحصري</h4>
                <p className="text-xs text-slate-400 mt-1">تواصل معنا للتعرف على أحدث العروض والفرص المتاحة فوراً.</p>
                <button onClick={() => openModal("CONSULTATION")} className="portal-consult-btn mt-4 inline-flex">
                  طلب قائمة الوحدات المتاحة
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 4. OWNER SELL YOUR PROPERTY SECTION ─── */}
      <section id="sell-section" className="portal-section sell-unit-hero-section">
        <div className="portal-container">
          <div className="sell-unit-glass-banner">
            <div className="sell-text-side">
              <span className="section-tag gold">خدمة ملاك العقارات</span>
              <h2 className="sell-title">هل تملك وحدة عقارية وتريد بيعها أو تأجيرها بأعلى عائد؟</h2>
              <p className="sell-desc">
                اعرض وحدتك الآن مع شركة دارك العقارية. نقوم بتسويق وحدتك لقاعدة مشترين جادة ومؤهلة مع الحفاظ التام على سرية بياناتك وعنوان الوحدة الدقيق. يمكنك رفع حتى 10 صور للوحدة وسيقوم مستشارنا بالتواصل معك لترتيب كافة التفاصيل.
              </p>
              <div className="sell-features-list">
                <div className="feature-item">
                  <CheckCircle2 size={16} className="text-gold" />
                  <span>تسويق مجاني للوحدات المعتمدة</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={16} className="text-gold" />
                  <span>حجب العنوان والتفاصيل الحساسة عن العامة</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={16} className="text-gold" />
                  <span>فحص قانوني ومتابعة حتى إتمام العقد</span>
                </div>
              </div>
              <button
                onClick={() => openModal("SELL_UNIT")}
                className="sell-submit-action-btn"
              >
                <Plus size={18} />
                <span>سجل وحدتك وارفع صورها الآن</span>
              </button>
            </div>

            <div className="sell-visual-side">
              <div className="sell-preview-card">
                <div className="preview-top-badge">نموذج العرض الآمن</div>
                <div className="preview-inner-box">
                  <div className="text-xs text-gold font-bold mb-1">✓ حماية بيانات المالك</div>
                  <div className="text-sm font-extrabold text-white mb-2">تسويق احترافي بالصور بدون إفصاح العنوان</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    نحن لا نعرض رقم الشقة أو رقم العمارة أو بيانات التواصل الخاصة بك في العلن؛ نحن نتولى الفلترة الكاملة للمشترين.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. CONTACT US SECTION ─── */}
      <section id="contact-section" className="portal-section contact-section">
        <div className="portal-container">
          <div className="contact-grid-layout">
            {/* Info Side */}
            <div className="contact-info-card">
              <span className="section-tag">تواصل معنا</span>
              <h2 className="contact-main-title">نحن هنا لمساعدتك في اتخاذ القرار العقاري الصحيح</h2>
              <p className="contact-subtext">
                سواء كنت تبحث عن استثمار مستقبلي، شراء منزل العمر، أو تسويق وحدتك؛ فريقنا مستعد لخدمتك.
              </p>

              <div className="contact-points-list">
                <div className="contact-point-item">
                  <div className="point-icon"><Phone size={18} /></div>
                  <div>
                    <div className="point-label">خدمة العملاء والاستشارات</div>
                    <div className="point-val" dir="ltr">+20 100 000 0000</div>
                  </div>
                </div>

                <div className="contact-point-item">
                  <div className="point-icon"><MessageCircle size={18} /></div>
                  <div>
                    <div className="point-label">المراسلة الفورية عبر واتساب</div>
                    <div className="point-val" dir="ltr">+20 100 000 0000</div>
                  </div>
                </div>

                <div className="contact-point-item">
                  <div className="point-icon"><MapPin size={18} /></div>
                  <div>
                    <div className="point-label">المقر الرئيسي</div>
                    <div className="point-val">التجمع الخامس &bull; القاهرة الجديدة &bull; مصر</div>
                  </div>
                </div>

                <div className="contact-point-item">
                  <div className="point-icon"><Clock size={18} /></div>
                  <div>
                    <div className="point-label">مواعيد العمل الرسمية</div>
                    <div className="point-val">السبت إلى الخميس: 10:00 ص &ndash; 8:00 م</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="contact-form-card">
              <h3 className="form-card-title">أرسل استفسارك وسنعاود الاتصال بك</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveTab("CONTACT");
                  handleSubmitInquiry(e);
                }}
                className="portal-quick-form"
              >
                <div className="form-field">
                  <label>الاسم بالكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسمك الكريم"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="portal-input"
                  />
                </div>

                <div className="form-field">
                  <label>رقم الهاتف / الواتساب *</label>
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
                  <label>المنطقة المهتم بها</label>
                  <input
                    type="text"
                    placeholder="مثال: التجمع، زايد، العاصمة..."
                    value={formData.preferredZone}
                    onChange={(e) => setFormData({ ...formData, preferredZone: e.target.value })}
                    className="portal-input"
                  />
                </div>

                <div className="form-field">
                  <label>تفاصيل الاستفسار أو متطلباتك</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب تفاصيل طلبك أو موعد الاتصال المناسب لك..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="portal-input"
                  />
                </div>

                {errorMessage && (
                  <div className="form-alert-error">
                    <AlertCircle size={15} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="form-alert-success">
                    <CheckCircle2 size={15} />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="portal-submit-btn"
                >
                  {loading ? "جاري الإرسال..." : "إرسال الطلب الآن"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. INTERACTIVE MODAL FOR ALL ACTIONS ─── */}
      {activeTab !== "NONE" && (
        <div className="portal-modal-backdrop" onClick={closeModal}>
          <div className="portal-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-gold" />
                <h3 className="modal-heading">
                  {activeTab === "CONSULTATION" && "حجز استشارة عقارية مجانية"}
                  {activeTab === "VIEWING" && (selectedPropertyForViewing ? `طلب معاينة: ${selectedPropertyForViewing.projectName}` : "طلب معاينة ميدانية")}
                  {activeTab === "SELL_UNIT" && "عرض وحدة عقارية للبيع (مع رفع الصور)"}
                  {activeTab === "CONTACT" && "تواصل واستفسار مع مستشار دارك"}
                </h3>
              </div>
              <button onClick={closeModal} className="modal-close-icon-btn">
                <X size={20} />
              </button>
            </div>

            {successMessage ? (
              <div className="modal-success-screen">
                <CheckCircle2 size={54} className="text-emerald-400 mb-3" />
                <h4 className="text-lg font-bold text-white mb-2">تم استلام طلبكم بنجاح!</h4>
                <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  شكراً لثقتكم بشركة دارك للاستثمار العقاري. تم تسجيل طلبكم في نظامنا وسيقوم أحد مستشارينا بالتواصل معكم خلال وقت وجيز.
                </p>
                <button onClick={closeModal} className="portal-consult-btn mt-6">
                  إغلاق النافذة
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitInquiry} className="modal-form-body">
                {errorMessage && (
                  <div className="form-alert-error mb-4">
                    <AlertCircle size={15} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Common Client Info */}
                <div className="modal-form-grid">
                  <div className="form-field">
                    <label>الاسم بالكامل *</label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الثلاثي"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="portal-input"
                    />
                  </div>

                  <div className="form-field">
                    <label>رقم الهاتف / الواتساب *</label>
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

                {/* Sell Unit Specific Fields */}
                {activeTab === "SELL_UNIT" && (
                  <div className="sell-unit-special-fields mt-3 pt-3 border-t border-subtle">
                    <div className="text-xs font-bold text-gold mb-3">بيانات ومواصفات الوحدة المعروضة</div>
                    <div className="modal-form-grid">
                      <div className="form-field">
                        <label>نوع الوحدة</label>
                        <select
                          value={formData.unitType}
                          onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                          className="portal-input"
                        >
                          <option value="شقة">شقة سكنية</option>
                          <option value="فيلا">فيلا مستقلة</option>
                          <option value="تاون هاوس">تاون هاوس / توين هاوس</option>
                          <option value="دوبلكس">دوبلكس</option>
                          <option value="بنتهاوس">بنتهاوس</option>
                          <option value="تجاري / إداري">محل أو مكتب تجاري</option>
                        </select>
                      </div>

                      <div className="form-field">
                        <label>المنطقة / الكومباوند *</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: التجمع الخامس، زايد..."
                          value={formData.preferredZone}
                          onChange={(e) => setFormData({ ...formData, preferredZone: e.target.value })}
                          className="portal-input"
                        />
                      </div>

                      <div className="form-field">
                        <label>المساحة الإجمالية (م²)</label>
                        <input
                          type="number"
                          placeholder="مثال: 165"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                          className="portal-input"
                        />
                      </div>

                      <div className="form-field">
                        <label>السعر المطلوب (جنيه) *</label>
                        <input
                          type="number"
                          required
                          placeholder="مثال: 4500000"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="portal-input"
                        />
                      </div>

                      <div className="form-field">
                        <label>غرف النوم</label>
                        <input
                          type="number"
                          placeholder="عدد الغرف"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                          className="portal-input"
                        />
                      </div>

                      <div className="form-field">
                        <label>الدور / الطابق</label>
                        <input
                          type="text"
                          placeholder="مثال: الثاني"
                          value={formData.floor}
                          onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                          className="portal-input"
                        />
                      </div>
                    </div>

                    {/* Image Upload Component (Max 10 images, <= 500 KB) */}
                    <div className="mt-4">
                      <label className="text-xs font-bold text-slate-200 block mb-2">
                        صور الوحدة (حتى 10 صور &bull; الحد الأقصى 500 كيلوبايت للصورة)
                      </label>
                      <UnitImageManager
                        images={formData.images}
                        onChange={(imgs) => setFormData({ ...formData, images: imgs })}
                        maxImages={10}
                      />
                    </div>
                  </div>
                )}

                {/* Consultation / Viewing / Notes */}
                {activeTab !== "SELL_UNIT" && (
                  <div className="modal-form-grid mt-3">
                    <div className="form-field">
                      <label>المنطقة المفضلة</label>
                      <input
                        type="text"
                        placeholder="مثال: القاهرة الجديدة، 6 أكتوبر..."
                        value={formData.preferredZone}
                        onChange={(e) => setFormData({ ...formData, preferredZone: e.target.value })}
                        className="portal-input"
                      />
                    </div>

                    <div className="form-field">
                      <label>الميزانية المتوقعة (جنيه)</label>
                      <input
                        type="number"
                        placeholder="الحد الأقصى للميزانية"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="portal-input"
                      />
                    </div>
                  </div>
                )}

                <div className="form-field mt-3">
                  <label>ملاحظات إضافية أو تفاصيل تفضل إخبارنا بها</label>
                  <textarea
                    rows={2}
                    placeholder="أي مواصفات خاصة أو وقت الاتصال المفضل..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="portal-input"
                  />
                </div>

                <div className="modal-footer-actions mt-5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="portal-submit-btn"
                  >
                    {loading ? "جاري تسجيل الطلب..." : "تأكيد وإرسال الطلب"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="portal-cancel-btn"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── 7. FOOTER (NO LOGIN LINKS) ─── */}
      <footer className="portal-footer">
        <div className="portal-container footer-flex">
          <div className="footer-brand-side">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="text-gold" size={22} />
              <span className="font-extrabold text-base text-white">دارك للاستثمار والتسويق العقاري</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              شريكك العقاري الموثوق في مصر. نقدم استشارات استثمارية متخصصة، تسويق وحدات بأساليب متطورة، وحفظ تام لسرية بيانات العملاء والملاك.
            </p>
          </div>

          <div className="footer-links-side">
            <div className="footer-col">
              <div className="footer-col-title">روابط سريعة</div>
              <a href="#featured-units">الوحدات الحصرية</a>
              <a href="#services">خدماتنا العقارية</a>
              <a href="#sell-section">عرض وحدة للبيع</a>
              <a href="#contact-section">تواصل معنا</a>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">الخدمات التفاعلية</div>
              <button onClick={() => openModal("CONSULTATION")} className="footer-link-btn">حجز استشارة مجانية</button>
              <button onClick={() => openModal("VIEWING")} className="footer-link-btn">طلب معاينة وحدة</button>
              <button onClick={() => openModal("SELL_UNIT")} className="footer-link-btn">تسجيل وحدة مالك</button>
            </div>
          </div>
        </div>

        <div className="portal-container copyright-row">
          <div>دارك للاستثمار العقاري &copy; 2026 &bull; كافة الحقوق محفوظة</div>
          <div className="text-[11px] text-slate-500">Darek Real Estate Consultancy Portal</div>
        </div>
      </footer>
    </div>
  );
}

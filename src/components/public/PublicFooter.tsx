import React from "react";
import Link from "next/link";
import { Building2, MapPin, Phone, MessageCircle, ShieldCheck } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="public-unified-footer">
      <div className="portal-container footer-content-grid">
        {/* Brand Side */}
        <div className="footer-main-info">
          <div className="flex items-center gap-3 mb-3">
            <div className="brand-logo-gem-sm">
              <Building2 size={20} className="text-gold" />
            </div>
            <span className="font-extrabold text-lg text-white">دارك للاستثمار والتسويق العقاري</span>
          </div>
          <p className="footer-company-mission">
            منظومة الاستشارات والتسويق العقاري الموثوقة في مصر. نقدم دراسات جدوى استثمارية حقيقية، تسويقاً حصرياً للوحدات المتميزة، وحماية مطلقة لسرية بيانات الملاك والمشترين.
          </p>
          <div className="footer-security-pill">
            <ShieldCheck size={14} className="text-gold" />
            <span>حفظ سرية العناوين والملاك &bull; فحص ومراجعة قانونية</span>
          </div>
        </div>

        {/* Quick Nav Col */}
        <div className="footer-links-group">
          <div className="footer-group-title">أقسام الموقع</div>
          <Link href="/" className="footer-nav-link">الرئيسية</Link>
          <Link href="/properties" className="footer-nav-link">الكتالوج العقاري للوحدات</Link>
          <Link href="/portfolio" className="footer-nav-link">سابقة الأعمال والشركاء</Link>
          <Link href="/sell" className="footer-nav-link">اعرض وحدتك للبيع</Link>
          <Link href="/contact" className="footer-nav-link">تواصل معنا</Link>
        </div>

        {/* Services Col */}
        <div className="footer-links-group">
          <div className="footer-group-title">الخدمات العقارية</div>
          <Link href="/contact?service=consultation" className="footer-nav-link">استشارات الشراء والاستثمار</Link>
          <Link href="/properties" className="footer-nav-link">وحدات سكنية وتجارية مميزة</Link>
          <Link href="/sell" className="footer-nav-link">تسويق وحدات الملاك بالصور</Link>
          <Link href="/contact" className="footer-nav-link">تنسيق مواعيد المعاينات</Link>
        </div>

        {/* Contact Info Col */}
        <div className="footer-links-group">
          <div className="footer-group-title">التواصل والمقر</div>
          <div className="footer-contact-row">
            <MapPin size={15} className="text-gold shrink-0 mt-0.5" />
            <span>التجمع الخامس، القاهرة الجديدة، مصر</span>
          </div>
          <div className="footer-contact-row">
            <Phone size={15} className="text-gold shrink-0" />
            <span dir="ltr">+20 100 000 0000</span>
          </div>
          <div className="footer-contact-row">
            <MessageCircle size={15} className="text-green-400 shrink-0" />
            <span>متاح عبر واتساب طوال أيام الأسبوع</span>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="portal-container footer-bottom-subbar">
        <div>دارك للاستثمار والتسويق العقاري &copy; 2026 &bull; كافة الحقوق محفوظة</div>
        <div className="text-xs text-slate-500">Darak Real Estate Portal</div>
      </div>
    </footer>
  );
}

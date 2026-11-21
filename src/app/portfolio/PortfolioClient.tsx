"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  TrendingUp,
  MapPin,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export default function PortfolioClient() {
  const partnerDevelopers = [
    { name: "إعمار مصر (Emaar Misr)", projects: "ميفيدا، مراسي، كايرو جيت، أبتاون كايرو", badge: "مطور رئيسي" },
    { name: "مجموعة طلعت مصطفى (TMG)", projects: "مدينتي، الرحاب، سيليا، نور، بريفادو", badge: "شراكة استراتيجية" },
    { name: "بالم هيلز للتعمير (Palm Hills)", projects: "بالم هيلز التجمع، بادية، بالم هيلز أكتوبر", badge: "مطور معتمد" },
    { name: "سوديك (SODIC)", projects: "فيليت، إيست تاون، سوديك ويست، كرمة", badge: "مطور رئيسي" },
    { name: "ماونتن فيو (Mountain View)", projects: "آي سيتي التجمع، آي سيتي أكتوبر، رأس الحكمة", badge: "مطور معتمد" },
    { name: "أورا ديفلوبرز (ORA Developers)", projects: "زيد إيست، زد الشيخ زايد، سيلفرساندز", badge: "مشروعات حصرية" },
  ];

  const milestones = [
    { number: "+1,500", label: "وحدة عقارية تم تسويقها بنجاح", desc: "في مختلف أرقى المدن والتجمعات السكنية في مصر" },
    { number: "+50", label: "مشروع وكومباوند استثماري معتمد", desc: "تم فحص كافة المستندات والتراخيص القانونية لها" },
    { number: "98%", label: "نسبة رضا العملاء والمستثمرين", desc: "وفق استبيانات الجودة الدورية بعد استلام الوحدات" },
    { number: "100%", label: "حماية وخصوصية بيانات الملاك", desc: "نظام مشفر يحجب العناوين الدقيقة عن المتطفلين" },
  ];

  const specializations = [
    {
      title: "استشارات الاستثمار وإعادة البيع (Resale & Primary)",
      desc: "دراسة شاملة لحركة الأسعار والعائد الإيجاري المتوقع لمساعدة المستثمرين على تحقيق أعلى عائد رأسمالي.",
      icon: TrendingUp,
    },
    {
      title: "التسويق الحصري لخدمة الملاك المباشرين",
      desc: "تسويق احترافي بالصور والوسائط الرقمية لقاعدة مشترين مؤهلين وجادين بدون إفصاح العناوين للعامة.",
      icon: ShieldCheck,
    },
    {
      title: "الفحص القانوني والتعاقدي الشامل",
      desc: "مراجعة موقف الوحدة مع الشركة المطورة وأجهزة المدن والتأكد من خلوها من أي نزاعات أو متأخرات مالية.",
      icon: Award,
    },
  ];

  return (
    <div dir="rtl" className="public-portal-root">
      <PublicHeader />

      {/* Hero Section */}
      <section className="portfolio-hero-banner">
        <div className="portal-container text-center">
          <div className="section-tag mb-4">بورتفوليو وإنجازات دارك العقارية</div>
          <h1 className="portfolio-main-heading">
            سجل حافل بالثقة، وشراكات مع كبرى <span className="gold-shimmer-text">صناع العقار</span> في مصر
          </h1>
          <p className="portfolio-subheading">
            على مدار سنوات، قمنا ببناء سمعة رائدة تستند إلى الشفافية، الدقة في الاستشارة، وتوفير أرقى الفرص السكنية والاستثمارية الحصرية.
          </p>
        </div>
      </section>

      {/* Stats Counters Grid */}
      <section className="portal-container mb-20">
        <div className="portfolio-milestones-grid">
          {milestones.map((m, idx) => (
            <div key={idx} className="milestone-box-card">
              <div className="milestone-value">{m.number}</div>
              <div className="milestone-label">{m.label}</div>
              <div className="milestone-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Developers Portfolio Grid */}
      <section className="portal-container mb-24">
        <div className="section-head text-center">
          <span className="section-tag">سابقة الأعمال والشراكات</span>
          <h2 className="section-title-large">أبرز المطورين والمشروعات المعتمدة</h2>
          <p className="section-subtitle">
            نعمل كوكيل استشاري معتمد لأكبر الكيانات العقارية، مما يضمن لعملائنا أفضل الأسعار وأنظمة السداد
          </p>
        </div>

        <div className="developers-showcase-grid">
          {partnerDevelopers.map((dev, idx) => (
            <div key={idx} className="developer-card-item">
              <div className="dev-card-top">
                <div className="dev-icon-badge">
                  <Building2 size={22} className="text-gold" />
                </div>
                <span className="dev-category-pill">{dev.badge}</span>
              </div>
              <h3 className="dev-name">{dev.name}</h3>
              <div className="dev-projects-list">
                <span className="text-muted text-xs block mb-1">أبرز المشروعات:</span>
                <span className="text-white text-sm font-bold">{dev.projects}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Specializations & Core Values */}
      <section className="portal-container mb-24">
        <div className="section-head text-center">
          <span className="section-tag">لماذا تختار شركة دارك؟</span>
          <h2 className="section-title-large">معايير عمل ترتقي لطموحاتك الاستثمارية</h2>
        </div>

        <div className="specializations-grid">
          {specializations.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="spec-card">
                <div className="spec-icon-wrap">
                  <Icon size={26} className="text-gold" />
                </div>
                <h3 className="spec-title">{s.title}</h3>
                <p className="spec-desc">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="portal-container mb-24">
        <div className="portfolio-cta-banner">
          <div>
            <h2 className="cta-banner-title">جاهز لبدء استثمارك العقاري القادم؟</h2>
            <p className="cta-banner-sub">
              تصفح كتالوج الوحدات المتاحة حالياً أو احجز استشارة مجانية مع خبيرنا العقاري.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/properties" className="btn-consultation-gold px-8 py-3 text-base">
              تصفح الكتالوج العقاري &larr;
            </Link>
            <Link href="/contact" className="btn-secondary-white px-8 py-3 text-base">
              طلب استشارة استثمارية
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

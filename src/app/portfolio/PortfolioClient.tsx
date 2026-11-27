"use client";

import { useSiteText, usePublicHeroStyle, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React from "react";

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
  const text = useSiteText();
  const heroStyle = usePublicHeroStyle();
  const partnerDevelopers = [
    { name: text("partners.partnerDevelopers1_name"), projects: text("partners.partnerDevelopers1_projects"), badge: text("partners.partnerDevelopers1_badge") },
    { name: text("partners.partnerDevelopers2_name"), projects: text("partners.partnerDevelopers2_projects"), badge: text("partners.partnerDevelopers2_badge") },
    { name: text("partners.partnerDevelopers3_name"), projects: text("partners.partnerDevelopers3_projects"), badge: text("partners.partnerDevelopers3_badge") },
    { name: text("partners.partnerDevelopers4_name"), projects: text("partners.partnerDevelopers4_projects"), badge: text("partners.partnerDevelopers4_badge") },
    { name: text("partners.partnerDevelopers5_name"), projects: text("partners.partnerDevelopers5_projects"), badge: text("partners.partnerDevelopers5_badge") },
    { name: text("partners.partnerDevelopers6_name"), projects: text("partners.partnerDevelopers6_projects"), badge: text("partners.partnerDevelopers6_badge") },
  ];

  const milestones = [
    { number: text("milestones.milestones1_number"), label: text("milestones.milestones1_label"), desc: text("milestones.milestones1_desc") },
    { number: text("milestones.milestones2_number"), label: text("milestones.milestones2_label"), desc: text("milestones.milestones2_desc") },
    { number: text("milestones.milestones3_number"), label: text("milestones.milestones3_label"), desc: text("milestones.milestones3_desc") },
    { number: text("milestones.milestones4_number"), label: text("milestones.milestones4_label"), desc: text("milestones.milestones4_desc") },
  ];

  const specializations = [
    {
      title: text("services.specializations1_title"),
      desc: text("services.specializations1_desc"),
      icon: TrendingUp,
    },
    {
      title: text("services.specializations2_title"),
      desc: text("services.specializations2_desc"),
      icon: ShieldCheck,
    },
    {
      title: text("services.specializations3_title"),
      desc: text("services.specializations3_desc"),
      icon: Award,
    },
  ];

  return (
    <div className="public-portal-root">
      <PublicHeader />

      {/* Hero Section */}
      <section className="portfolio-hero-banner" style={heroStyle}>
        <div className="portal-container text-center">
          <div className="section-tag mb-4">{text("hero.text1")}</div>
          <h1 className="portfolio-main-heading">{text("hero.text2")} <span className="gold-shimmer-text">{text("hero.text3")}</span> {text("hero.text4")}</h1>
          <p className="portfolio-subheading">{text("hero.text5")}</p>
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
          <span className="section-tag">{text("partners.text1")}</span>
          <h2 className="section-title-large">{text("partners.text2")}</h2>
          <p className="section-subtitle">{text("partners.text3")}</p>
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
                <span className="text-muted text-xs block mb-1">{text("partners.text4")}</span>
                <span className="text-white text-sm font-bold">{dev.projects}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Specializations & Core Values */}
      <section className="portal-container mb-24">
        <div className="section-head text-center">
          <span className="section-tag">{text("services.text1")}</span>
          <h2 className="section-title-large">{text("services.text2")}</h2>
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
            <h2 className="cta-banner-title">{text("contact.text1")}</h2>
            <p className="cta-banner-sub">{text("contact.text2")}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/properties" className="btn-consultation-gold px-8 py-3 text-base">{text("contact.text3")}</Link>
            <Link href="/contact" className="btn-secondary-white px-8 py-3 text-base">{text("contact.text4")}</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

"use client";

import { useSiteText, usePublicHeroStyle, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React, { useState } from "react";

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
  const text = useSiteText();
  const heroStyle = usePublicHeroStyle();
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
      if (!res.ok) throw new Error(data.error || text("hero.text1"));

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
      setError(err.message || text("hero.text2"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="public-portal-root">
      <PublicHeader />

      {/* Hero Section */}
      <section className="sell-page-hero" style={heroStyle}>
        <div className="portal-container text-center">
          <div className="section-tag gold mb-4">{text("hero.text3")}</div>
          <h1 className="portfolio-main-heading">{text("hero.text4")} <span className="gold-shimmer-text">{text("hero.text5")}</span>
          </h1>
          <p className="portfolio-subheading">{text("hero.text6")}</p>
        </div>
      </section>

      {/* Security Guarantees Bar */}
      <section className="portal-container mb-16">
        <div className="sell-guarantees-grid">
          <div className="guarantee-box">
            <EyeOff size={24} className="text-gold mb-3" />
            <h3 className="guarantee-title">{text("guarantees.text1")}</h3>
            <p className="guarantee-desc">{text("guarantees.text2")}</p>
          </div>

          <div className="guarantee-box">
            <UserCheck size={24} className="text-gold mb-3" />
            <h3 className="guarantee-title">{text("guarantees.text3")}</h3>
            <p className="guarantee-desc">{text("guarantees.text4")}</p>
          </div>

          <div className="guarantee-box">
            <Lock size={24} className="text-gold mb-3" />
            <h3 className="guarantee-title">{text("guarantees.text5")}</h3>
            <p className="guarantee-desc">{text("guarantees.text6")}</p>
          </div>
        </div>
      </section>

      {/* Sell Form Container */}
      <section className="portal-container mb-24">
        <div className="sell-form-wrapper-card">
          <div className="sell-form-header">
            <div className="flex items-center gap-2 mb-1">
              <Home size={20} className="text-gold" />
              <h2 className="text-xl font-extrabold text-white">{text("form.text1")}</h2>
            </div>
            <p className="text-xs text-muted">{text("form.text2")}</p>
          </div>

          {success && (
            <div className="form-alert-success my-6 p-4">
              <CheckCircle2 size={22} className="shrink-0" />
              <div>
                <div className="font-extrabold text-base">{text("form.text3")}</div>
                <div className="text-xs mt-1">{text("form.text4")}</div>
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
            <h3 className="form-section-divider-title">{text("owner.text1")}</h3>
            <div className="grid-3-form gap-4">
              <div className="form-field">
                <label>{text("owner.text2")}</label>
                <input
                  type="text"
                  required
                  placeholder={text("owner.text3")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("owner.text4")}</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder={text("owner.text5")}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("owner.text6")}</label>
                <input
                  type="email"
                  placeholder={text("owner.text7")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            {/* Step 2: Unit Specs */}
            <h3 className="form-section-divider-title mt-6">{text("unit.text1")}</h3>
            <div className="grid-3-form gap-4">
              <div className="form-field">
                <label>{text("unit.text2")}</label>
                <select
                  value={formData.unitType}
                  onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                  className="portal-input"
                >
                  <option value="شقة">{text("unit.text3")}</option>
                  <option value="فيلا">{text("unit.text4")}</option>
                  <option value="توين هاوس">{text("unit.text5")}</option>
                  <option value="تاون هاوس">{text("unit.text6")}</option>
                  <option value="دوبلكس">{text("unit.text7")}</option>
                  <option value="بنتهاوس">{text("unit.text8")}</option>
                  <option value="مكتب إداري">{text("unit.text9")}</option>
                  <option value="محل تجاري">{text("unit.text10")}</option>
                </select>
              </div>

              <div className="form-field">
                <label>{text("unit.text11")}</label>
                <input
                  type="text"
                  required
                  placeholder={text("unit.text12")}
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("unit.text13")}</label>
                <input
                  type="text"
                  required
                  placeholder={text("unit.text14")}
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            <div className="grid-4-form gap-4 mt-2">
              <div className="form-field">
                <label>{text("unit.text15")}</label>
                <input
                  type="number"
                  required
                  placeholder={text("unit.text16")}
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("unit.text17")}</label>
                <input
                  type="text"
                  placeholder={text("unit.text18")}
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("unit.text19")}</label>
                <input
                  type="number"
                  placeholder={text("unit.text20")}
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("unit.text21")}</label>
                <input
                  type="number"
                  placeholder={text("unit.text22")}
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            {/* Step 3: Financials */}
            <h3 className="form-section-divider-title mt-6">{text("unit.text23")}</h3>
            <div className="grid-2-form gap-4">
              <div className="form-field">
                <label>{text("unit.text24")}</label>
                <input
                  type="number"
                  required
                  placeholder={text("unit.text25")}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("unit.text26")}</label>
                <input
                  type="text"
                  placeholder={text("unit.text27")}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="portal-input"
                />
              </div>
            </div>

            {/* Step 4: Images */}
            <h3 className="form-section-divider-title mt-6">{text("unit.text28")}</h3>
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
              {loading ? text("unit.text29") : text("unit.text30")}
            </button>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

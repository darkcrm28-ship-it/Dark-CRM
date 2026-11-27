"use client";

import { useSiteText, usePublicHeroStyle, publicWhatsAppLink, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React, { useState } from "react";

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
  const text = useSiteText();
  const heroStyle = usePublicHeroStyle();
  const phone = text("details.phone");
  const email = text("details.email");
  const map = text("details.maps");
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
      if (!res.ok) throw new Error(data.error || text("hero.text1"));

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
      setError(err.message || text("hero.text2"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-portal-root">
      <PublicHeader />

      {/* Header Banner */}
      <section className="contact-page-hero" style={heroStyle}>
        <div className="portal-container text-center">
          <div className="section-tag mb-4">{text("hero.text3")}</div>
          <h1 className="portfolio-main-heading">{text("hero.text4")} <span className="gold-shimmer-text">{text("hero.text5")}</span>
          </h1>
          <p className="portfolio-subheading">{text("hero.text6")}</p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="portal-container mb-24">
        <div className="contact-main-grid-layout">
          {/* Contact Details & Cards */}
          <div className="contact-cards-column">
            <h2 className="contact-column-title">{text("channels.text1")}</h2>
            <p className="text-muted text-sm mb-6 leading-relaxed">{text("channels.text2")}</p>

            <div className="contact-direct-cards-list">
              {/* Phone Card */}
              <div className="contact-direct-card">
                <div className="direct-card-icon gold">
                  <Phone size={22} />
                </div>
                <div>
                  <div className="direct-card-label">{text("channels.text3")}</div>
                  <a className="direct-card-val" dir="ltr" href={"tel:" + phone.replace(/[^+0-9]/g, "")}>{phone}</a>
                  <div className="direct-card-sub">{text("channels.text5")}</div>
                </div>
              </div>

              {/* WhatsApp Card */}
              <a
                href={publicWhatsAppLink(text("details.whatsapp"), text("details.whatsappMessage"))}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-direct-card hover-glow"
              >
                <div className="direct-card-icon green">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <div className="direct-card-label">{text("channels.text6")}</div>
                  <div className="direct-card-val text-green-400">{text("channels.text7")}</div>
                  <div className="direct-card-sub">{text("channels.text8")}</div>
                </div>
              </a>

              {email && <div className="contact-direct-card">
                <div className="direct-card-icon gold"><Send size={22} /></div>
                <div><div className="direct-card-label">{text("details.emailLabel")}</div>
                <a className="direct-card-val" dir="ltr" href={"mailto:" + email}>{email}</a></div>
              </div>}
              {/* Location Card */}
              <div className="contact-direct-card">
                <div className="direct-card-icon blue">
                  <MapPin size={22} />
                </div>
                <div>
                  <div className="direct-card-label">{text("channels.text9")}</div>
                  {map
                    ? <a className="direct-card-val" href={map} target="_blank" rel="noopener noreferrer">{text("channels.text10")}</a>
                    : <div className="direct-card-val">{text("channels.text10")}</div>}
                  <div className="direct-card-sub">{text("channels.text11")}</div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="contact-direct-card">
                <div className="direct-card-icon purple">
                  <Clock size={22} />
                </div>
                <div>
                  <div className="direct-card-label">{text("channels.text12")}</div>
                  <div className="direct-card-val">{text("channels.text13")}</div>
                  <div className="direct-card-sub">{text("channels.text14")}</div>
                </div>
              </div>
            </div>

            <div className="privacy-reassurance-box mt-6">
              <ShieldCheck size={20} className="text-gold shrink-0" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong>{text("channels.text15")}</strong> {text("channels.text16")}</div>
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="contact-form-column">
            <div className="dedicated-contact-form-card">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-gold" />
                <h3 className="form-card-title-lg">{text("form.text1")}</h3>
              </div>
              <p className="text-xs text-muted mb-6">{text("form.text2")}</p>

              {success && (
                <div className="form-alert-success mb-6 p-4">
                  <CheckCircle2 size={20} className="shrink-0" />
                  <div>
                    <div className="font-bold">{text("form.text3")}</div>
                    <div className="text-xs mt-1">{text("form.text4")}</div>
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
                  <label>{text("form.text5")}</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="portal-input"
                  >
                    <option value="CONSULTATION">{text("form.text6")}</option>
                    <option value="VIEWING">{text("form.text7")}</option>
                    <option value="CONTACT">{text("form.text8")}</option>
                  </select>
                </div>

                <div className="grid-2-form gap-4">
                  <div className="form-field">
                    <label>{text("form.text9")}</label>
                    <input
                      type="text"
                      required
                      placeholder={text("form.text10")}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="portal-input"
                    />
                  </div>

                  <div className="form-field">
                    <label>{text("form.text11")}</label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder={text("form.text12")}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="portal-input"
                    />
                  </div>
                </div>

                <div className="grid-2-form gap-4">
                  <div className="form-field">
                    <label>{text("form.text13")}</label>
                    <input
                      type="text"
                      placeholder={text("form.text14")}
                      value={formData.preferredZone}
                      onChange={(e) => setFormData({ ...formData, preferredZone: e.target.value })}
                      className="portal-input"
                    />
                  </div>

                  <div className="form-field">
                    <label>{text("form.text15")}</label>
                    <input
                      type="text"
                      placeholder={text("form.text16")}
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="portal-input"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>{text("form.text17")}</label>
                  <textarea
                    rows={4}
                    placeholder={text("form.text18")}
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
                  {loading ? text("form.text19") : text("form.text20")}
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

import { useSiteText, usePublicSite, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React from "react";

import { Building2, MapPin, Phone, MessageCircle, ShieldCheck } from "lucide-react";

export default function PublicFooter() {
  const text = useSiteText(true);
  const { contact } = usePublicSite();
  return (
    <footer className="public-unified-footer">
      <div className="portal-container footer-content-grid">
        {/* Brand Side */}
        <div className="footer-main-info">
          <div className="flex items-center gap-3 mb-3">
            <div className="brand-logo-gem-sm">
              <Building2 size={20} className="text-gold" />
            </div>
            <span className="font-extrabold text-lg text-white">{text("footer.text1")}</span>
          </div>
          <p className="footer-company-mission">{text("footer.text2")}</p>
          <div className="footer-security-pill">
            <ShieldCheck size={14} className="text-gold" />
            <span>{text("footer.text3")}</span>
          </div>
        </div>

        {/* Quick Nav Col */}
        <div className="footer-links-group">
          <div className="footer-group-title">{text("footer.text4")}</div>
          <Link href="/" className="footer-nav-link">{text("footer.text5")}</Link>
          <Link href="/properties" className="footer-nav-link">{text("footer.text6")}</Link>
          <Link href="/portfolio" className="footer-nav-link">{text("footer.text7")}</Link>
          <Link href="/sell" className="footer-nav-link">{text("footer.text8")}</Link>
          <Link href="/contact" className="footer-nav-link">{text("footer.text9")}</Link>
        </div>

        {/* Services Col */}
        <div className="footer-links-group">
          <div className="footer-group-title">{text("footer.text10")}</div>
          <Link href="/contact?service=consultation" className="footer-nav-link">{text("footer.text11")}</Link>
          <Link href="/properties" className="footer-nav-link">{text("footer.text12")}</Link>
          <Link href="/sell" className="footer-nav-link">{text("footer.text13")}</Link>
          <Link href="/contact" className="footer-nav-link">{text("footer.text14")}</Link>
        </div>

        {/* Contact Info Col */}
        <div className="footer-links-group">
          <div className="footer-group-title">{text("footer.text15")}</div>
          <div className="footer-contact-row">
            <MapPin size={15} className="text-gold shrink-0 mt-0.5" />
            <span>{text("footer.text16")}</span>
          </div>
          {contact["details.phone"] && <div className="footer-contact-row">
            <Phone size={15} className="text-gold shrink-0" />
            <a dir="ltr" href={"tel:" + contact["details.phone"].replace(/[^+0-9]/g, "")}>{contact["details.phone"]}</a>
          </div>}
          <div className="footer-contact-row">
            <MessageCircle size={15} className="text-green-400 shrink-0" />
            <span>{text("footer.text18")}</span>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="portal-container footer-bottom-subbar">
        <div>{text("footer.text19")}</div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500">{text("footer.text20")}</span>
          <Link href="/login" className="btn-secondary-white public-footer-login">{text("footer.dashboardLogin")}</Link>
        </div>
      </div>
    </footer>
  );
}

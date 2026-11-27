"use client";

import { useState } from "react";
import type { PublicListingDto } from "@/lib/public-listings";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
import ViewingRequest from "./ViewingRequest";
import { SiteLink, usePublicSite } from "./PublicSiteContent";

export default function PropertyDetails({ property, images }: { property: PublicListingDto; images: string[] }) {
  const en = usePublicSite().locale === "en";
  const [photo, setPhoto] = useState(0);
  const [shareStatus, setShareStatus] = useState("");
  const title = property.title || property.projectName || (en ? "Property" : "وحدة عقارية");
  const specs = [
    [en ? "Handover month" : "شهر الاستلام", property.deliveryMonth],
    [en ? "Area" : "المساحة", property.size == null ? null : property.size + (en ? " m²" : " م²")],
    [en ? "Bedrooms" : "غرف النوم", property.bedrooms], [en ? "Bathrooms" : "الحمامات", property.bathrooms],
    [en ? "Finishing" : "التشطيب", property.finishing], [en ? "Type" : "النوع", property.unitType],
  ];
  return <div className="public-portal-root darak-home">
    <PublicHeader />
    <main className="portal-container darak-property">
      <SiteLink href="/properties">{en ? "Property catalog" : "الكتالوج العقاري"}</SiteLink>
      <h1>{title}</h1><p>{property.zone} · DK-{property.id.slice(0,6).toUpperCase()}</p>
      <button type="button" className="darak-save" onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else { await navigator.clipboard.writeText(url); setShareStatus(en ? "Link copied" : "تم نسخ الرابط"); }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus(url);
        }
      }}>{en ? "Share listing" : "مشاركة الإعلان"}</button>
      <button type="button" className="darak-save" onClick={async () => {
        try {
          const response = await fetch("/api/public/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"favorite",propertyId:property.id})});
          setShareStatus(response.ok ? (en ? "Saved to your favorites" : "تم الحفظ في المفضلة") : response.status === 401 ? (en ? "Sign in through My account to save favorites." : "ادخل من حسابي لحفظ المفضلة.") : (en ? "Could not save property." : "تعذّر حفظ الوحدة."));
        } catch { setShareStatus(en ? "Check your connection." : "راجع اتصال الإنترنت."); }
      }}>{en ? "Save to favorites" : "حفظ في المفضلة"}</button>
      <span role="status">{shareStatus}</span>
      {images.length > 0 && <figure>
        <img className="darak-property-photo" src={images[photo]} alt={title + " " + (photo + 1)} />
        {images.length > 1 && <figcaption>{images.map((_, i) => <button key={i} aria-pressed={photo === i} aria-label={(en ? "Photo " : "صورة ") + (i + 1)} onClick={() => setPhoto(i)}>{i+1}</button>)}</figcaption>}
      </figure>}
      <strong>{property.purpose === "RENT" ? (en ? "Monthly rent" : "الإيجار الشهري") : (en ? "Total price" : "السعر الإجمالي")} · {property.price ? property.price.toLocaleString(en ? "en-EG" : "ar-EG") + (en ? " EGP" : " ج.م") : en ? "On request" : "عند الطلب"}</strong>
      <dl>{specs.filter(([,value]) => value != null).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {property.description && <p>{property.description}</p>}
      <ViewingRequest id={property.id} />
    </main>
    <PublicFooter />
  </div>;
}

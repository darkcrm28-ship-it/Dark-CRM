"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteLink, usePublicSite } from "./PublicSiteContent";

type Slide = { image: string; title: string; href: string };

export default function HomeCarousel({ slides, children }: { slides: Slide[]; children: ReactNode }) {
  const en = usePublicSite().locale === "en";
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const move = (by: number) => setIndex(current => (current + by + slides.length) % slides.length);
  const slide = slides[index] ?? slides[0];
  return (
    <section className="darak-hero" aria-label={en ? "Discover DARAK" : "اكتشف دارك"}>
      <img key={slide.image} src={slide.image} alt="" className="darak-hero-photo" fetchPriority="high" />
      <div className="darak-hero-wash" />
      <div className="portal-container darak-hero-inner">{children}</div>
      <div className="darak-slide-bar"
        onTouchStart={event => { const point = event.touches[0]; start.current = { x: point.clientX, y: point.clientY }; }}
        onTouchCancel={() => { start.current = null; }}
        onTouchEnd={event => {
          if (!start.current) return;
          const point = event.changedTouches[0];
          const dx = point.clientX - start.current.x;
          const dy = point.clientY - start.current.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
          start.current = null;
        }}>
        <span aria-live="polite"><SiteLink href={slide.href}>{slide.title}</SiteLink></span>
        {slides.length > 1 && <div className="darak-controls">
          <button onClick={() => move(-1)} aria-label={en ? "Previous slide" : "الشريحة السابقة"}><ChevronRight /></button>
          <span dir="ltr">{index + 1} / {slides.length}</span>
          <button onClick={() => move(1)} aria-label={en ? "Next slide" : "الشريحة التالية"}><ChevronLeft /></button>
        </div>}
      </div>
    </section>
  );
}

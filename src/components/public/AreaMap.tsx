"use client";
import { useState } from "react";
import { matchPublicArea } from "@/lib/public-areas";

export default function AreaMap({ zones, en }: { zones: string[]; en: boolean }) {
  const available = zones.filter(zone => matchPublicArea(zone));
  const [selected, setSelected] = useState("");
  const area = matchPublicArea(selected);
  if (!available.length) return null;
  return <section className="darak-map">
    <label>{en ? "Explore a neighborhood on the map" : "استكشف الحي على الخريطة"}
      <select value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">{en ? "Select an area" : "اختر منطقة"}</option>
        {available.map(zone => <option key={zone} value={zone}>{en ? matchPublicArea(zone)?.en : zone}</option>)}
      </select>
    </label>
    {area && <><p>{en ? "Approximate neighborhood location" : "موقع تقريبي للحي"}</p>
      <iframe title={en ? area.en : area.ar} loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?bbox=${area.lon-.04},${area.lat-.03},${area.lon+.04},${area.lat+.03}&layer=mapnik&marker=${area.lat},${area.lon}`} />
      <a href={`/properties?zone=${encodeURIComponent(selected)}`}>{en ? "Browse homes in this area" : "عرض وحدات المنطقة"}</a>
    </>}
  </section>;
}

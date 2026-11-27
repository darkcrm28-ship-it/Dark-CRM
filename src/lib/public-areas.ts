// Approximate area centers only. No unit or owner addresses are used.
export const publicAreas = [
  { ar: "التجمع الخامس", en: "Fifth Settlement", aliases: ["التجمع", "القاهرة الجديدة", "new cairo"], lat: 30.02, lon: 31.48 },
  { ar: "الشيخ زايد", en: "Sheikh Zayed", aliases: ["زايد", "sheikh zayed city"], lat: 30.04, lon: 30.98 },
  { ar: "مدينتي", en: "Madinaty", aliases: ["madinati"], lat: 30.09, lon: 31.64 },
  { ar: "الساحل الشمالي", en: "North Coast", aliases: ["الساحل", "sahel"], lat: 30.84, lon: 28.95 },
];
export function matchPublicArea(name: string) {
  const term = name.trim().toLowerCase();
  return publicAreas.find(area => [area.ar, area.en, ...area.aliases].some(alias => alias.toLowerCase() === term));
}

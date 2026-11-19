"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();
      setIsOpen(true);
    }
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const combined = [
            ...(data.customers || []).map((c: any) => ({ ...c, type: "CUSTOMER" })),
            ...(data.properties || []).map((p: any) => ({ ...p, type: "PROPERTY", name: p.title || p.projectName })),
          ];
          setResults(combined.slice(0, 8));
        }
      } catch (err) {}
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const onSelect = (item: any) => {
    setIsOpen(false);
    setQuery("");
    if (item.type === "CUSTOMER") router.push(`/dashboard/customers/${item.id}`);
    else if (item.type === "PROJECT") router.push(`/dashboard/projects`);
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <input 
          autoFocus 
          className="cmd-input" 
          placeholder="ابحث عن عملاء، مشاريع، أو وحدات... (Esc للإغلاق)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cmd-results">
          {loading && <div style={{ padding: 20, textAlign: "center" }}>جاري البحث...</div>}
          {!loading && query && results.length === 0 && <div style={{ padding: 20, textAlign: "center" }}>لا توجد نتائج.</div>}
          {results.map((item, idx) => (
            <div 
              key={item.id} 
              className={`cmd-item ${idx === activeIndex ? "active" : ""}`}
              onClick={() => onSelect(item)}
            >
              <div className="cmd-item-icon">{item.type === "CUSTOMER" ? "👤" : "🏢"}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.phone || item.description || "معلومات إضافية"}</div>
              </div>
              <div style={{ marginRight: "auto", fontSize: 10, opacity: 0.5 }}>{item.type}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 24px", background: "rgba(255,255,255,0.02)", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
          استخدم الأسهم للتنقل و Enter للاختيار. يمكنك البحث برقم الهاتف أو الاسم.
        </div>
      </div>
    </div>
  );
}

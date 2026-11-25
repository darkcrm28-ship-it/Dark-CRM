"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClientReadCache } from "@/lib/client-read-cache";
import { useRouter } from "next/navigation";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [searchCache] = useState(() => createClientReadCache<any>());
  const requestRef = useRef<AbortController | null>(null);
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

  useEffect(() => () => requestRef.current?.abort(), []);

  const updateQuery = (value: string) => {
    requestRef.current?.abort();
    setQuery(value);
    setResults([]);
    setSearched(false);
    setLoading(false);
    setError(false);
  };

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || query.trim().length < 2) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(false);
    try {
      const data = await searchCache.load("/api/search?q=" + encodeURIComponent(query.trim()), controller.signal);
      if (controller.signal.aborted) return;
      const combined = [
        ...(data.customers || []).map((c: any) => ({ ...c, type: "CUSTOMER" })),
        ...(data.properties || []).map((p: any) => ({ ...p, type: "PROPERTY", name: p.title || p.projectName })),
      ];
      setResults(combined.slice(0, 8));
      setSearched(true);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const onSelect = (item: any) => {
    setIsOpen(false);
    updateQuery("");
    if (item.type === "CUSTOMER") router.push(`/dashboard/customers/${item.id}`);
    else if (item.type === "PROJECT") router.push(`/dashboard/projects`);
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={search} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input 
          autoFocus 
          className="cmd-input" 
          placeholder="ابحث عن عملاء، مشاريع، أو وحدات... (Esc للإغلاق)"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
        />
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading || query.trim().length < 2}>البحث</button>
        </form>
        <div className="cmd-results">
          {loading && <div style={{ padding: 20, textAlign: "center" }}>جاري البحث...</div>}
          {error && <p role="alert" style={{ padding: 16 }}>تعذّر البحث. حاول مرة أخرى.</p>}
          {!loading && !error && searched && results.length === 0 && <div style={{ padding: 20, textAlign: "center" }}>لا توجد نتائج.</div>}
          {results.map((item) => (
            <div 
              key={item.id} 
              className="cmd-item"
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
          يمكنك البحث برقم الهاتف أو الاسم.
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { createClientReadCache } from "@/lib/client-read-cache";
import { useRouter } from "next/navigation";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchCache] = useState(() => createClientReadCache<any>());
  const requestRef = useRef<AbortController | null>(null);
  const searchBox = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchBox.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const setDraft = (value: string) => {
    requestRef.current?.abort();
    setQuery(value);
    setResults(null);
    setError(false);
    setLoading(false);
  };

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (loading || q.length < 2) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setOpen(true);
    setError(false);
    try {
      const data = await searchCache.load("/api/search?q=" + encodeURIComponent(q), controller.signal);
      if (!controller.signal.aborted) setResults(data);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleSelect = (path: string) => {
    setQuery(""); setResults(null); setOpen(false);
    router.push(path);
  };

  const STATUS_LABELS: Record<string, string> = { NEW: "جديد", INTERESTED: "مهتم", AVAILABLE: "متاحة", SOLD: "مباعة" };

  return (
    <div ref={searchBox} style={{ position: "relative" }}>
      <form onSubmit={search} style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.4 }}>🔍</span>
        <input
          value={query}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          className="input"
          placeholder="بحث عالمي... (عملاء، عقارات)"
          style={{ paddingRight: 32, width: 280, fontSize: 13 }}
        />
        <button type="button"
          onClick={() => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
              const rec = new SpeechRecognition();
              rec.lang = "ar-SA";
              rec.onresult = (e: any) => {
                const text = e.results[0][0].transcript;
                setDraft(text);
              };
              rec.start();
            }
          }}
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "none", cursor: "pointer", fontSize: 16 }}
          title="بحث صوتي"
        >
          🎙️
        </button>
      </div>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={loading || query.trim().length < 2}>البحث</button>
      </form>

      {open && (loading || error || results) && (
        <div style={{
          position: "absolute", top: "calc(100% + 12px)", right: 0, width: "max(320px, 100%)", minWidth: 320,
          background: "rgba(10, 15, 25, 0.98)", 
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          borderRadius: 14, 
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.05)",
          zIndex: 10000, 
          overflow: "hidden",
          animation: "slideUp 0.2s ease-out"
        }}>
          {loading && <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>جاري البحث...</div>}

          {error && <p role="alert" style={{ padding: 16 }}>تعذّر البحث. حاول مرة أخرى.</p>}
          {!loading && !error && results && (
            <>
              {results.customers?.length > 0 && (
                <div>
                  <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 800, color: "var(--gold-primary)", background: "rgba(212, 175, 55, 0.05)", textTransform: "uppercase" }}>العملاء</div>
                  {results.customers.map((c: any) => (
                    <div key={c.id} onClick={() => handleSelect(`/dashboard/customers/${c.id}`)}
                      style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.phone}</div>
                      </div>
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>{STATUS_LABELS[c.status] || c.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.properties?.length > 0 && (
                <div>
                  <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 800, color: "var(--gold-primary)", background: "rgba(212, 175, 55, 0.05)", textTransform: "uppercase" }}>العقارات</div>
                  {results.properties.map((p: any) => (
                    <div key={p.id} onClick={() => handleSelect(`/dashboard/properties`)}
                      style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.projectName} — وحدة {p.unitNumber}</div>
                        {p.price && <div style={{ fontSize: 11, color: "var(--accent-green)" }}>{p.price.toLocaleString()} جنيه</div>}
                      </div>
                      <span className={`badge ${p.status === "AVAILABLE" ? "badge-green" : "badge-red"}`} style={{ fontSize: 10 }}>{STATUS_LABELS[p.status] || p.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {!results.customers?.length && !results.properties?.length && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>لا توجد نتائج لـ "{query}"</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

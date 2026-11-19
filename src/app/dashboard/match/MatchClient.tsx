"use client";
import { useState } from "react";

function scoreMatch(buyer: any, property: any): number {
  let score = 0;
  if (buyer.budgetMax && property.price && property.price <= buyer.budgetMax) score += 40;
  if (buyer.budgetMin && property.price && property.price >= buyer.budgetMin) score += 10;
  if (buyer.preferredZone && property.zone && property.zone.toLowerCase().includes(buyer.preferredZone.toLowerCase())) score += 30;
  if (buyer.preferredSize && property.unitType && property.unitType.toLowerCase().includes(buyer.preferredSize.toLowerCase())) score += 20;
  return Math.min(score, 100);
}

export default function MatchClient({ buyers, properties }: { buyers: any[]; properties: any[] }) {
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [zone, setZone] = useState("");
  const [size, setSize] = useState("");
  const [loading, setLoading] = useState(false);

  const effectiveBuyer = selectedBuyer ? {
    ...selectedBuyer,
    budgetMin: budgetMin ? +budgetMin : selectedBuyer.budgetMin,
    budgetMax: budgetMax ? +budgetMax : selectedBuyer.budgetMax,
    preferredZone: zone || selectedBuyer.preferredZone,
    preferredSize: size || selectedBuyer.preferredSize,
  } : null;

  const matches = effectiveBuyer
    ? properties
        .map((p) => ({ ...p, score: scoreMatch(effectiveBuyer, p) }))
        .sort((a, b) => b.score - a.score)
    : [];

  const savePreferences = async () => {
    if (!selectedBuyer) return;
    setLoading(true);
    await fetch(`/api/customers/${selectedBuyer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetMin: budgetMin ? +budgetMin : null, budgetMax: budgetMax ? +budgetMax : null, preferredZone: zone || null, preferredSize: size || null }),
    });
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">مطابقة مشترين — وحدات</div>
          <div className="page-subtitle">اختر مشترياً لعرض الوحدات الأنسب له تلقائياً</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Buyers List */}
        <div className="card animate-in" style={{ padding: 0, maxHeight: "calc(100vh - 220px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700, fontSize: 13 }}>المشترون المهتمون ({buyers.length})</div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {buyers.map((b) => (
              <div key={b.id}
                onClick={() => { setSelectedBuyer(b); setBudgetMin(b.budgetMin || ""); setBudgetMax(b.budgetMax || ""); setZone(b.preferredZone || ""); setSize(b.preferredSize || ""); }}
                style={{
                  padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)",
                  background: selectedBuyer?.id === b.id ? "rgba(212,175,55,0.08)" : "transparent",
                  borderLeft: selectedBuyer?.id === b.id ? "3px solid var(--gold-primary)" : "3px solid transparent",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.phone}</div>
                {(b.budgetMax || b.preferredZone) && (
                  <div style={{ fontSize: 10, color: "var(--accent-blue)", marginTop: 2 }}>
                    {b.budgetMax ? `حتى ${b.budgetMax.toLocaleString()} جنيه` : ""}
                    {b.preferredZone ? ` — ${b.preferredZone}` : ""}
                  </div>
                )}
              </div>
            ))}
            {buyers.length === 0 && <div className="empty-state" style={{ padding: 32 }}>لا يوجد مشترون مهتمون</div>}
          </div>
        </div>

        {/* Right Panel */}
        {selectedBuyer ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-in">
            {/* Buyer Preferences */}
            <div className="card" style={{ borderTop: "2px solid var(--gold-primary)" }}>
              <div style={{ fontWeight: 800, marginBottom: 14 }}>⚙️ تفضيلات {selectedBuyer.name}</div>
              <div className="grid-4" style={{ gap: 10, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">الحد الأدنى للميزانية</label>
                  <input type="number" className="input" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="500,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">الحد الأقصى للميزانية</label>
                  <input type="number" className="input" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="2,000,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">المنطقة المفضلة</label>
                  <input className="input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="التجمع، مدينتي..." />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع الوحدة</label>
                  <input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="شقة، فيلا..." />
                </div>
              </div>
              <button onClick={savePreferences} disabled={loading} className="btn btn-secondary btn-sm">
                {loading ? "..." : "💾 حفظ التفضيلات"}
              </button>
            </div>

            {/* Matches */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700 }}>
                🔗 الوحدات المقترحة ({matches.filter((m) => m.score > 0).length} متطابقة)
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {matches.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon">🏠</div><div className="empty-state-text">لا توجد وحدات متاحة في قاعدة البيانات</div></div>
                ) : (
                  matches.map((p) => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
                      background: p.score >= 70 ? "rgba(16,185,129,0.04)" : p.score >= 40 ? "rgba(212,175,55,0.03)" : "transparent"
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.projectName} — وحدة {p.unitNumber}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {p.zone && `📍 ${p.zone}`}
                          {p.size && ` · 📐 ${p.size}م²`}
                          {p.bedrooms && ` · 🛏 ${p.bedrooms} غرف`}
                          {p.unitType && ` · ${p.unitType}`}
                        </div>
                        {p.price && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-green)", marginTop: 4 }}>{p.price.toLocaleString()} جنيه</div>}
                      </div>
                      <div style={{ textAlign: "center", flexShrink: 0, marginRight: 16 }}>
                        <div style={{
                          width: 50, height: 50, borderRadius: "50%",
                          background: p.score >= 70 ? "rgba(16,185,129,0.15)" : p.score >= 40 ? "rgba(212,175,55,0.15)" : "var(--bg-elevated)",
                          border: `2px solid ${p.score >= 70 ? "var(--accent-green)" : p.score >= 40 ? "var(--gold-primary)" : "var(--border-subtle)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 900,
                          color: p.score >= 70 ? "var(--accent-green)" : p.score >= 40 ? "var(--gold-primary)" : "var(--text-muted)"
                        }}>{p.score}%</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>تطابق</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div className="empty-state"><div className="empty-state-icon">👈</div><div className="empty-state-text">اختر مشترياً من القائمة لعرض الوحدات المناسبة له</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

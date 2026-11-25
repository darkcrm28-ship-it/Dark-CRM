"use client";
import { useState } from "react";
import { createClientReadCache } from "@/lib/client-read-cache";
import { CUSTOMER_SEARCH_PAGE_SIZE } from "@/lib/customer-search";

type Buyer = { id: string; name: string; phone: string; budgetMin: number | null; budgetMax: number | null; preferredZone: string | null; propertyType: string | null };
type BuyerPage = { customers: Buyer[]; page: number; totalPages: number };
type MatchProperty = { id: string; projectName: string | null; unitNumber: string | null; zone: string | null; size: number | null; bedrooms: number | null; unitType: string | null; price: number | null };
type MatchPage = { properties: MatchProperty[]; page: number; pageSize: number; total: number };

export default function MatchClient() {
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [buyerQuery, setBuyerQuery] = useState("");
  const [appliedBuyerQuery, setAppliedBuyerQuery] = useState("");
  const [buyerPage, setBuyerPage] = useState<BuyerPage | null>(null);
  const [matchPage, setMatchPage] = useState<MatchPage | null>(null);
  const [appliedFilters, setAppliedFilters] = useState("");
  const [buyerCache] = useState(() => createClientReadCache<BuyerPage>());
  const [matchCache] = useState(() => createClientReadCache<MatchPage>());
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [zone, setZone] = useState("");
  const [unitType, setUnitType] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const buyers = buyerPage?.customers ?? [];
  const matches = matchPage?.properties ?? [];
  const matchPages = matchPage ? Math.max(1, Math.ceil(matchPage.total / matchPage.pageSize)) : 1;

  const run = async (action: () => Promise<void>, success = "") => {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("تعذّر إتمام العملية. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const loadBuyers = (page: number, q = appliedBuyerQuery) => run(async () => {
    const params = new URLSearchParams({ view: "MATCH_BUYERS", page: String(page), q });
    setBuyerPage(await buyerCache.load("/api/customers?" + params));
    setAppliedBuyerQuery(q);
  });

  const selectBuyer = (buyer: Buyer) => {
    if (loading) return;
    setSelectedBuyer(buyer);
    setBudgetMin(buyer.budgetMin ? String(buyer.budgetMin) : "");
    setBudgetMax(buyer.budgetMax ? String(buyer.budgetMax) : "");
    setZone(buyer.preferredZone ?? "");
    setUnitType(buyer.propertyType ?? "");
    setMatchPage(null);
  };

  const loadMatches = (page: number, filters = appliedFilters) => run(async () => {
    const params = new URLSearchParams(filters);
    params.set("page", String(page));
    params.set("status", "AVAILABLE");
    params.set("summary", "1");
    params.set("limit", String(CUSTOMER_SEARCH_PAGE_SIZE));
    setMatchPage(await matchCache.load("/api/properties?" + params));
    setAppliedFilters(filters);
  });

  const searchMatches = (event: React.FormEvent) => {
    event.preventDefault();
    const filters = new URLSearchParams();
    for (const [key, value] of Object.entries({ minPrice: budgetMin, maxPrice: budgetMax, zone: zone.trim(), unitType: unitType.trim() })) {
      if (value) filters.set(key, value);
    }
    void loadMatches(1, filters.toString());
  };

  const savePreferences = () => {
    if (!selectedBuyer) return;
    void run(async () => {
      const response = await fetch("/api/customers/" + encodeURIComponent(selectedBuyer.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          preferredZone: zone.trim() || null,
          propertyType: unitType.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("Preference update failed");
      const updated = { ...selectedBuyer, budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null, preferredZone: zone.trim() || null,
        propertyType: unitType.trim() || null };
      setSelectedBuyer(updated);
      setBuyerPage(current => current && ({ ...current, customers: current.customers.map(buyer => buyer.id === updated.id ? updated : buyer) }));
      buyerCache.clear();
    }, "تم حفظ التفضيلات.");
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">مطابقة مشترين — وحدات</div>
          <div className="page-subtitle">اختَر مشتريًا، وحدد معايير البحث عن الوحدات.</div>
        </div>
      </div>

      {message && <p role="status" className="page-subtitle">{message}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Buyers List */}
        <div className="card animate-in" style={{ padding: 0, maxHeight: "calc(100vh - 220px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700, fontSize: 13 }}>المشترون المهتمون ({buyers.length})</div>
          <form onSubmit={(event) => { event.preventDefault(); void loadBuyers(1, buyerQuery.trim()); }} style={{ display: "flex", gap: 8, padding: 10 }}>
            <input className="input" aria-label="اسم المشتري أو رقم الهاتف" value={buyerQuery} onChange={event => setBuyerQuery(event.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>البحث</button>
          </form>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {buyers.map((b) => (
              <div key={b.id}
                onClick={() => selectBuyer(b)}
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
            {buyers.length === 0 && <div className="empty-state" style={{ padding: 32 }}>{buyerPage ? "لا توجد نتائج مطابقة" : "اضغط «البحث» لعرض المشترين"}</div>}
            {buyerPage && buyerPage.totalPages > 1 && (
              <nav aria-label="صفحات المشترين" style={{ display: "flex", alignItems: "center", gap: 8, padding: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={loading || buyerPage.page <= 1} onClick={() => void loadBuyers(buyerPage.page - 1)}>السابق</button>
                <span>{buyerPage.page} / {buyerPage.totalPages}</span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={loading || buyerPage.page >= buyerPage.totalPages} onClick={() => void loadBuyers(buyerPage.page + 1)}>التالي</button>
              </nav>
            )}
          </div>
        </div>

        {/* Right Panel */}
        {selectedBuyer ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-in">
            {/* Buyer Preferences */}
            <form onSubmit={searchMatches} className="card" style={{ borderTop: "2px solid var(--gold-primary)" }}>
              <div style={{ fontWeight: 800, marginBottom: 14 }}>⚙️ تفضيلات {selectedBuyer.name}</div>
              <div className="grid-4" style={{ gap: 10, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">الحد الأدنى للميزانية</label>
                  <input type="number" className="input" min="0" step="0.01" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="500,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">الحد الأقصى للميزانية</label>
                  <input type="number" className="input" min="0" step="0.01" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="2,000,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">المنطقة المفضلة</label>
                  <input className="input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="التجمع، مدينتي..." />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع الوحدة</label>
                  <input className="input" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="شقة، فيلا..." />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={loading} className="btn btn-primary btn-sm">البحث</button>
                <button type="button" onClick={savePreferences} disabled={loading} className="btn btn-secondary btn-sm">حفظ التفضيلات</button>
              </div>
            </form>

            {/* Matches */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700 }}>
                🔗 الوحدات المقترحة ({matchPage?.total ?? 0} متطابقة)
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {matches.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon">🏠</div><div className="empty-state-text">{matchPage ? "لا توجد وحدات مطابقة" : "اضغط «البحث» لعرض الوحدات المطابقة"}</div></div>
                ) : (
                  matches.map((p) => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
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
                    </div>
                  ))
                )}
              </div>
              {matchPage && matchPages > 1 && (
                <nav aria-label="صفحات الوحدات المطابقة" style={{ display: "flex", alignItems: "center", gap: 8, padding: 12 }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={loading || matchPage.page <= 1} onClick={() => void loadMatches(matchPage.page - 1)}>السابق</button>
                  <span>{matchPage.page} / {matchPages}</span>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={loading || matchPage.page >= matchPages} onClick={() => void loadMatches(matchPage.page + 1)}>التالي</button>
                </nav>
              )}
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

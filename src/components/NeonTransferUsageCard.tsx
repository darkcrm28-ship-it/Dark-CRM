"use client";

import { useCallback, useEffect, useState } from "react";

type Usage = {
  usedBytes: number;
  limitBytes: number;
  warningThresholdBytes: number;
  periodStart: string | null;
  periodEnd: string | null;
  checkedAt: string;
};

type ApiState =
  | { status: "loading" }
  | { status: "ready"; usage: Usage }
  | { status: "setup" }
  | { status: "error"; unauthorized?: boolean };

const numberFormat = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 });

function formatGB(bytes: number) {
  return `${numberFormat.format(bytes / 1_000_000_000)} جيجابايت`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function NeonTransferUsageCard() {
  const [state, setState] = useState<ApiState>({ status: "loading" });

  const loadUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/neon-transfer", { cache: "no-store" });
      const payload = await response.json();
      if (response.status === 503 && payload.code === "NEON_API_KEY_NOT_CONFIGURED") {
        setState({ status: "setup" });
        return;
      }
      if (payload.code === "NEON_API_UNAUTHORIZED") {
        setState({ status: "error", unauthorized: true });
        return;
      }
      if (!response.ok || typeof payload.usedBytes !== "number") {
        setState({ status: "error" });
        return;
      }
      setState({ status: "ready", usage: payload as Usage });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void loadUsage();
    const interval = window.setInterval(() => void loadUsage(), 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadUsage]);

  const cardStyle: React.CSSProperties = {
    padding: "18px 20px",
    borderRadius: 16,
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.10), rgba(15, 23, 42, 0.72))",
    border: "1px solid rgba(148, 163, 184, 0.20)",
    display: "grid",
    gap: 12,
  };

  if (state.status === "setup") {
    return (
      <section className="animate-in" style={cardStyle} aria-label="استهلاك نقل Neon">
        <strong style={{ color: "var(--text-primary)" }}>عداد نقل Neon غير مهيأ</strong>
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          أضف مفتاح Neon API كـ Cloudflare Secret باسم NEON_API_KEY لتفعيل العداد.
        </span>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="animate-in" style={{ ...cardStyle, borderColor: "rgba(239, 68, 68, 0.35)" }} aria-label="استهلاك نقل Neon">
        <strong style={{ color: "#fca5a5" }}>تعذر جلب استهلاك نقل Neon</strong>
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {state.unauthorized ? "تحقق من صلاحية مفتاح Neon للوصول إلى المشروع." : "سيُعاد التحقق تلقائيًا بعد ١٥ دقيقة."}
        </span>
        <button type="button" onClick={() => void loadUsage()} className="btn btn-sm btn-secondary" style={{ justifySelf: "start" }}>
          إعادة المحاولة
        </button>
      </section>
    );
  }

  if (state.status === "loading") {
    return (
      <section className="animate-in" style={cardStyle} aria-label="استهلاك نقل Neon" aria-busy="true">
        <strong style={{ color: "var(--text-primary)" }}>استهلاك نقل Neon</strong>
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>جارٍ قراءة الاستهلاك الحالي…</span>
      </section>
    );
  }

  const { usage } = state;
  const reachedWarning = usage.usedBytes >= usage.warningThresholdBytes;
  const percent = Math.min(100, (usage.usedBytes / usage.limitBytes) * 100);
  const accent = reachedWarning ? "#ef4444" : "#38bdf8";

  return (
    <section
      className="animate-in"
      style={{
        ...cardStyle,
        borderColor: reachedWarning ? "rgba(239, 68, 68, 0.50)" : "rgba(56, 189, 248, 0.28)",
        background: reachedWarning
          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(15, 23, 42, 0.78))"
          : cardStyle.background,
      }}
      aria-label="استهلاك نقل Neon للفترة الحالية"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>استهلاك نقل Neon</strong>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
            الفترة: {formatDate(usage.periodStart)} – {formatDate(usage.periodEnd)}
          </div>
        </div>
        <strong style={{ color: accent, fontSize: 18 }}>
          {formatGB(usage.usedBytes)} / {formatGB(usage.limitBytes)}
        </strong>
      </div>

      <div
        role="progressbar"
        aria-label="نسبة استهلاك نقل Neon"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        style={{ height: 10, borderRadius: 999, background: "rgba(148, 163, 184, 0.20)", overflow: "hidden" }}
      >
        <div style={{ width: `${percent}%`, height: "100%", borderRadius: 999, background: accent, transition: "width 300ms ease" }} />
      </div>

      {reachedWarning ? (
        <div role="alert" style={{ color: "#fecaca", fontSize: 13, fontWeight: 700 }}>
          تنبيه: وصل استهلاك النقل إلى ٤ جيجابايت. المتبقي حتى حد ٥ جيجابايت نحو {formatGB(Math.max(0, usage.limitBytes - usage.usedBytes))}.
          قلّل نقل البيانات لتجنب توقف Neon.
        </div>
      ) : (
        <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          يظهر التنبيه عند ٤ جيجابايت. آخر قراءة: {new Date(usage.checkedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}.
        </div>
      )}
      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
        هذا مؤشر استخدام من API وقد لا يطابق عداد الفوترة لحظيًا؛ راجعه مع صفحة الاستهلاك في Neon.
      </div>
    </section>
  );
}


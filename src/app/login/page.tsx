"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PWAButtons from "@/components/PWAButtons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
            borderRadius: "var(--radius-lg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 900, color: "#000",
            margin: "0 auto 16px",
            boxShadow: "var(--shadow-glow-strong)",
          }}>D</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)" }}>دارك</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>للاستثمار والتسويق العقاري</div>
          <div style={{
            height: 2, width: 60, margin: "16px auto 0",
            background: "linear-gradient(90deg, transparent, var(--gold-primary), transparent)"
          }} />
        </div>
        
        <PWAButtons />

        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>تسجيل الدخول</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>أدخل بيانات حسابك للمتابعة</div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input" placeholder="admin@dark.com" required
            />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input" placeholder="••••••••" required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "جاري التحقق..." : "دخول إلى النظام ←"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
          <div>نظام دارك CRM — النسخة التجريبية الأولى</div>
          <div style={{ color: "var(--gold-primary)", fontWeight: 700 }}>تم التطوير والتنفيذ بواسطة محمد مهدي</div>
        </div>
      </div>
    </div>
  );
}

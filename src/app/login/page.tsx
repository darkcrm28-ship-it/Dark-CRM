"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import PWAButtons from "@/components/PWAButtons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول، يرجى التأكد من البيانات.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-page-container">
      {/* Dynamic Ambient Background Glows */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      {/* Grid Mesh Overlay for depth */}
      <div className="ambient-grid-overlay" />

      <div className="login-glass-card">
        {/* Top Floating Security Pill */}
        <div className="login-security-badge">
          <ShieldCheck size={14} className="text-gold" />
          <span>منظومة سحابية مشفرة &middot; Cloudflare Protected</span>
        </div>

        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-emblem-box">
            <div className="login-emblem-inner">
              <Building2 size={32} className="login-emblem-icon" />
            </div>
            <div className="login-emblem-glow" />
          </div>

          <h1 className="login-brand-title">
            <span className="gold-gradient-text">دارك</span> CRM
          </h1>
          <p className="login-brand-subtitle">المنظومة العقارية الذكية المتكاملة</p>
        </div>

        {/* PWA Action Buttons */}
        <div style={{ marginBottom: 16 }}>
          <PWAButtons />
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="glass-error-banner">
            <span className="error-dot" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Email Input */}
          <div className="login-field-group">
            <label className="login-label">البريد الإلكتروني</label>
            <div className="login-input-wrapper">
              <Mail size={18} className="login-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="name@company.com"
                required
                autoComplete="email"
                dir="ltr"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="login-field-group">
            <div className="login-label-row">
              <label className="login-label">كلمة المرور</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-btn"
                tabIndex={-1}
              >
                {showPassword ? (
                  <>
                    <EyeOff size={14} /> <span>إخفاء</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} /> <span>إظهار</span>
                  </>
                )}
              </button>
            </div>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                dir="ltr"
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className="login-options-row">
            <label className="remember-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="custom-checkbox"
              />
              <span>تذكر بياناتي</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading-content">
                <span className="spinner-icon" />
                <span>جاري التحقق والدخول...</span>
              </span>
            ) : (
              <span className="btn-normal-content">
                <span>دخول إلى النظام</span>
                <ArrowLeft size={18} className="btn-arrow" />
              </span>
            )}
          </button>
        </form>

        {/* Features Highlights Pills */}
        <div className="login-features-row">
          <div className="feature-pill">
            <CheckCircle2 size={12} className="text-gold" />
            <span>تحديثات فورية</span>
          </div>
          <div className="feature-pill">
            <CheckCircle2 size={12} className="text-gold" />
            <span>نسخ احتياطي فوري</span>
          </div>
          <div className="feature-pill">
            <CheckCircle2 size={12} className="text-gold" />
            <span>حماية سحابية</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          <div>نظام دارك لإدارة العقارات والمبيعات &copy; 2026</div>
          <div className="developer-tag">Dark CRM &bull; Enterprise Real Estate Platform</div>
        </footer>
      </div>
    </div>
  );
}

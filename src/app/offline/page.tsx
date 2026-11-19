"use client";
export default function OfflinePage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#080b12",
      color: "#f1f5f9",
      fontFamily: "Cairo, sans-serif",
      textAlign: "center",
      padding: "24px",
      gap: "20px",
    }}>
      <div style={{ fontSize: 80 }}>📡</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#d4af37" }}>أنت غير متصل بالإنترنت</h1>
      <p style={{ fontSize: 15, color: "#94a3b8", maxWidth: 340, lineHeight: 1.7 }}>
        تحقق من اتصالك بالإنترنت وحاول مرة أخرى. يمكنك الاستمرار في تصفح الصفحات التي زرتها سابقاً.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "linear-gradient(135deg, #d4af37, #a8892a)",
          color: "#000",
          border: "none",
          borderRadius: 10,
          padding: "12px 28px",
          fontSize: 15,
          fontWeight: 800,
          cursor: "pointer",
          fontFamily: "Cairo, sans-serif",
        }}
      >
        🔄 إعادة المحاولة
      </button>
    </div>
  );
}

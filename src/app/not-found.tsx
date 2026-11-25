import Link from "next/link";

export default function NotFound() {
  return (
    <main dir="rtl" className="portal-container" style={{ minHeight: "65vh", display: "grid", alignContent: "center", justifyItems: "start", gap: 18 }}>
      <h1 className="section-title-large">الصفحة غير متاحة</h1>
      <Link href="/login" className="btn-secondary-white">دخول لوحة التحكم</Link>
    </main>
  );
}

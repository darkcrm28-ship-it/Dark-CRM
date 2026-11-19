import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 animate-fade-in">
      <div className="card max-w-2xl w-full text-center space-y-6 flex flex-col items-center glass-panel">
        <div className="w-20 h-20 bg-[var(--color-primary)] rounded-full flex items-center justify-center mb-4 shadow-glow">
          {/* Logo Placeholder */}
          <span className="text-2xl font-bold text-black">دارك</span>
        </div>
        
        <h1 className="text-4xl font-bold text-[var(--color-primary)]">
          دارك للاستثمار والتسويق العقاري
        </h1>
        
        <p className="text-lg text-[var(--color-text-secondary)]">
          نظام إدارة علاقات العملاء (CRM) المتكامل لإدارة فريق المبيعات والعملاء بفعالية واحترافية.
        </p>

        <div className="flex gap-4 mt-8">
          <Link href="/login" className="btn btn-primary px-8 py-3 text-lg">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}

import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireCustomerAccess } from "@/lib/auth";

export default async function UnitBrochurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCustomerAccess(id);
  if (access instanceof NextResponse) {
    if (access.status === 401) redirect("/login");
    notFound();
  }

  const customer = await prisma.customer.findFirst({
    where: access.where,
    include: { project: true }
  });

  if (!customer) notFound();

  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-10" style={{ fontFamily: "Inter, Roboto, sans-serif" }}>
      {/* Premium Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#d4af37] opacity-[0.05] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#25D366] opacity-[0.03] blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 animate-in">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-[#d4af37] mb-2 tracking-tighter">دارك</h1>
            <p className="text-gray-400 text-sm uppercase tracking-widest">Darek Real Estate • Exclusive Unit</p>
          </div>
          <div className="text-left">
            <span className="px-4 py-1 rounded-full border border-[#d4af37] text-[#d4af37] text-xs font-bold uppercase">PREMIUM LISTING</span>
          </div>
        </header>

        {/* Main Unit Card */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-in-1">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              وحدة عقارية مميزة في <br />
              <span className="text-[#d4af37]">{customer.project?.name || customer.projectName || "مشروع حصري"}</span>
            </h2>

            <div className="flex flex-wrap gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <span className="block text-[10px] text-gray-500 uppercase">المساحة</span>
                <span className="text-lg font-bold">{customer.unitSize || "—"} م²</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <span className="block text-[10px] text-gray-500 uppercase">الدور</span>
                <span className="text-lg font-bold">{customer.floor || "—"}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <span className="block text-[10px] text-gray-500 uppercase">الغرف</span>
                <span className="text-lg font-bold">{customer.bedrooms || "—"}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <span className="block text-[10px] text-gray-500 uppercase">التشطيب</span>
                <span className="text-lg font-bold">{customer.finishing || "—"}</span>
              </div>
            </div>

            <p className="text-gray-400 leading-relaxed mb-8 text-lg">
              تعتبر هذه الوحدة من الفرص المميزة المتاحة في المنطقة، حيث تتميز بموقع استراتيجي وتصميم داخلي واسع.
              {customer.preferencesSummary && ` الملاحظات: ${customer.preferencesSummary}`}
            </p>

            <div className="p-6 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-2xl mb-8">
              <span className="block text-sm text-[#d4af37] mb-1">السعر الإجمالي</span>
              <div className="text-4xl font-black text-white">
                {customer.askingPrice?.toLocaleString() || "اتصل لمعرفة السعر"}
                <span className="text-lg font-normal mr-2 text-gray-400">جنيه</span>
              </div>
            </div>

            <a
              href={`https://wa.me/201234567890?text=استفسار عن وحدة ${customer.projectName}`}
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5c] text-black font-black px-8 py-4 rounded-2xl transition-all hover:scale-105"
            >
              <span className="text-xl">💬</span>
              تواصل عبر واتساب للاستفسار
            </a>
          </div>

          {/* Side Info */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl animate-in-2">
            <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">تفاصيل إضافية</h3>
            <ul className="space-y-6">
              <li className="flex justify-between items-center">
                <span className="text-gray-500">المنطقة</span>
                <span className="font-bold">{customer.area || "—"}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-500">نوع العقار</span>
                <span className="font-bold">{customer.propertyType || "—"}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-500">رقم العمارة</span>
                <span className="font-bold">{customer.buildingNumber || "—"}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-500">حالة الأوراق</span>
                <span className="px-3 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded-lg text-sm font-bold">
                  {customer.paperworkStatus || "جاهزة"}
                </span>
              </li>
              {customer.installmentAmount && (
                <li className="bg-[#d4af37]/5 p-4 rounded-xl border border-[#d4af37]/10">
                  <span className="block text-xs text-[#d4af37] mb-1">نظام التقسيط</span>
                  <p className="text-sm">{customer.installmentAmount?.toLocaleString()} جنيه / {customer.installmentRemaining} قسط متبقي</p>
                  {customer.installmentDetails && <p className="text-[10px] text-gray-500 mt-2">{customer.installmentDetails}</p>}
                </li>
              )}
            </ul>

            <div className="mt-10 pt-10 border-top border-white/10 text-center">
              <div className="w-12 h-12 bg-[#d4af37] rounded-full mx-auto mb-4 flex items-center justify-center text-black font-bold text-xl">D</div>
              <p className="text-gray-500 text-xs uppercase tracking-widest">Powered by Darek CRM</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <footer className="mt-20 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} شركة دارك للاستثمار والتسويق العقاري. جميع الحقوق محفوظة.</p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .animate-in { animation: slideUp 0.8s ease forwards; }
        .animate-in-1 { animation: slideUp 1s ease forwards; }
        .animate-in-2 { animation: slideUp 1.2s ease forwards; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicPropertyPage({ params }: { params: { id: string } }) {
  const property = await prisma.property.findUnique({
    where: { id: params.id },
  });

  if (!property) notFound();

  return (
    <div style={{ background: "#080b12", minHeight: "100vh", color: "#f1f5f9", direction: "rtl", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ 
          background: "#111827", 
          borderRadius: 20, 
          overflow: "hidden", 
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }}>
          {/* Header */}
          <div style={{ 
            height: 200, 
            background: "linear-gradient(135deg, #1a2235, #080b12)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            flexDirection: "column",
            borderBottom: "1px solid rgba(212, 175, 55, 0.1)"
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏢</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#d4af37" }}>{property.title || property.projectName}</h1>
            <p style={{ fontSize: 14, color: "#94a3b8" }}>{property.zone}{property.unitNumber ? ` — وحدة ${property.unitNumber}` : ""}</p>
          </div>

          {/* Details */}
          <div style={{ padding: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
              <div style={{ background: "#1a2235", padding: 20, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>السعر</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{property.price?.toLocaleString()} جنيه</div>
              </div>
              <div style={{ background: "#1a2235", padding: 20, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>المساحة</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{property.size || "—"} م²</div>
              </div>
              <div style={{ background: "#1a2235", padding: 20, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>الغرف</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{property.bedrooms || "—"} نوم</div>
              </div>
              <div style={{ background: "#1a2235", padding: 20, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>الحمامات</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{property.bathrooms || "—"} حمام</div>
              </div>
            </div>

            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 15, borderBottom: "1px solid #1a2235", paddingBottom: 10 }}>وصف الوحدة</h3>
              <p style={{ lineHeight: 1.8, color: "#f1f5f9", fontSize: 15 }}>{property.description || "لا يوجد وصف إضافي لهذه الوحدة."}</p>
            </div>

            <div style={{ 
              background: "rgba(212, 175, 55, 0.05)", 
              border: "1px solid rgba(212, 175, 55, 0.15)", 
              padding: 25, 
              borderRadius: 15, 
              textAlign: "center" 
            }}>
              <h4 style={{ fontWeight: 800, marginBottom: 10 }}>هل أنت مهتم بهذه الوحدة؟</h4>
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>تواصل معنا الآن عبر واتساب للحصول على مزيد من التفاصيل أو لتحديد موعد معاينة.</p>
              <a 
                href={`https://wa.me/201234567890`} // Placeholder company number
                style={{ 
                  display: "inline-block", 
                  background: "#25D366", 
                  color: "#fff", 
                  padding: "12px 30px", 
                  borderRadius: 30, 
                  fontWeight: 800,
                  textDecoration: "none"
                }}
              >
                تواصل معنا 💬
              </a>
            </div>
          </div>

          <div style={{ padding: 20, textAlign: "center", borderTop: "1px solid #1a2235", fontSize: 12, color: "#475569" }}>
            تم توليد هذا الرابط بواسطة نظام Darek Real Estate CRM
          </div>
        </div>
      </div>
    </div>
  );
}

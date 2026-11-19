import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import BackupButton from "./BackupButton";

export default async function AuditLogPage() {
  const session = await getSession();
  if (session?.role !== "GENERAL_MANAGER") {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
    take: 100,
  });

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">سجل التغييرات (Audit Log)</div>
          <div className="page-subtitle">آخر 100 حركة تمت في النظام</div>
        </div>
        <BackupButton />
      </div>

      <div className="card animate-in-1" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>التوقيت</th>
                <th>المستخدم</th>
                <th>الإجراء</th>
                <th>النوع</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{log.user.name}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      log.action === "DELETE" ? "badge-red" : 
                      log.action === "CREATE" ? "badge-green" : 
                      log.action === "ASSIGN" ? "badge-gold" : "badge-gray"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{log.entity}</td>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{log.details}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="empty-state">لا توجد سجلات بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

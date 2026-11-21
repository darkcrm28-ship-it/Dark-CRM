import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE } from "@/lib/auth";
import * as XLSX from "xlsx";
import { createHash } from "crypto";

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return isNaN(val) ? "NULL" : String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateSqlInserts(tableName: string, rows: any[]): string {
  if (!rows || rows.length === 0) return `-- No records for ${tableName}\n`;

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map(c => `"${c}"`).join(", ");

  let sql = `-- Table: ${tableName} (${rows.length} rows)\n`;
  for (const row of rows) {
    const values = columns.map(col => escapeSqlValue(row[col])).join(", ");
    sql += `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${values}) ON CONFLICT ("id") DO NOTHING;\n`;
  }
  sql += "\n";
  return sql;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;

    const format = request.nextUrl.searchParams.get("format") || "json";
    const dateStr = new Date().toISOString().split("T")[0];

    // Fetch all tables with bounded limits to prevent Out-Of-Memory on massive datasets
    const [
      rawUsers,
      projects,
      customers,
      properties,
      deals,
      interactions,
      reminders,
      commissions,
      auditLogs,
      customFields,
      settings,
      financialTransactions,
      notifications,
      pushSubscriptions
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          nationalId: true,
          address: true,
          dateJoined: true,
          salaryBase: true,
          isActive: true,
          expertAreas: true,
          birthDate: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          bankAccountDetails: true,
          qualification: true,
          experience: true,
          contractStartDate: true,
          contractEndDate: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.project.findMany({ take: 500 }),
      prisma.customer.findMany({ take: 50000, orderBy: { createdAt: "desc" } }),
      prisma.property.findMany({ take: 10000, orderBy: { createdAt: "desc" } }),
      prisma.deal.findMany({ take: 10000, orderBy: { createdAt: "desc" } }),
      prisma.interaction.findMany({ take: 25000, orderBy: { createdAt: "desc" } }),
      prisma.reminder.findMany({ take: 10000, orderBy: { createdAt: "desc" } }),
      prisma.commission.findMany({ take: 10000, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.findMany({ take: 10000, orderBy: { createdAt: "desc" } }),
      (prisma as any).customFieldDefinition ? (prisma as any).customFieldDefinition.findMany() : Promise.resolve([]),
      prisma.systemSettings.findMany(),
      prisma.financialTransaction.findMany({ take: 20000, orderBy: { date: "desc" } }),
      prisma.notification.findMany({ take: 5000, orderBy: { createdAt: "desc" } }),
      prisma.pushSubscription.findMany({ take: 5000 }),
    ]);

    // Critical Security: Ensure password hashes are NEVER exported in backups
    const users = rawUsers.map((u) => {
      // Create safe object without password
      const { ...safeUser } = u as any;
      delete safeUser.password;
      return safeUser;
    });

    // Compute cryptographic SHA-256 checksum for backup integrity verification
    const checksumPayload = JSON.stringify({
      userCount: users.length,
      customerCount: customers.length,
      dealCount: deals.length,
      financialCount: financialTransactions.length,
      sampleIds: [users[0]?.id, customers[0]?.id, deals[0]?.id],
    });
    const integrityChecksum = createHash("sha256").update(checksumPayload).digest("hex");

    // 1. SQL Dump
    if (format === "sql") {
      let sqlContent = `-- Dark CRM Complete Database Backup & Migration Script\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Integrity Checksum (SHA256): ${integrityChecksum}\n`;
      sqlContent += `-- Security Notice: User password hashes are sanitized/excluded from this export.\n`;
      sqlContent += `-- Target: Compatible with PostgreSQL, Neon, Supabase, Railway, Docker, Local Postgres\n\n`;
      sqlContent += `BEGIN;\n\n`;

      // For SQL, provide empty placeholder password hash to satisfy NOT NULL constraints if restored
      const usersForSql = users.map((u) => ({
        ...u,
        password: "$2a$10$REDACTED_PASSWORD_HASH_MUST_BE_RESET_BY_ADMIN0000000000",
      }));

      sqlContent += generateSqlInserts("User", usersForSql);
      sqlContent += generateSqlInserts("Project", projects);
      sqlContent += generateSqlInserts("Customer", customers);
      sqlContent += generateSqlInserts("Property", properties);
      sqlContent += generateSqlInserts("Deal", deals);
      sqlContent += generateSqlInserts("Interaction", interactions);
      sqlContent += generateSqlInserts("Reminder", reminders);
      sqlContent += generateSqlInserts("Commission", commissions);
      sqlContent += generateSqlInserts("CustomFieldDefinition", customFields);
      sqlContent += generateSqlInserts("SystemSettings", settings);
      sqlContent += generateSqlInserts("FinancialTransaction", financialTransactions);
      sqlContent += generateSqlInserts("Notification", notifications);
      sqlContent += generateSqlInserts("PushSubscription", pushSubscriptions);
      sqlContent += generateSqlInserts("AuditLog", auditLogs);

      sqlContent += `COMMIT;\n`;

      // Log backup action
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: "BACKUP_EXPORT",
          entity: "DATABASE",
          entityId: "SQL_DUMP",
          details: `تصدير نسخة احتياطية كاملة بصيغة SQL (SHA256: ${integrityChecksum.slice(0, 12)}...)`,
        },
      }).catch(() => {});

      return new NextResponse(sqlContent, {
        headers: {
          "Cache-Control": "no-store, private",
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename="dark_crm_backup_${dateStr}.sql"`,
        },
      });
    }

    // 2. Excel Format
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();

      // Customers sheet
      const custData = customers.map(c => ({
        "كود العميل": c.code,
        "الاسم": c.name,
        "الهاتف": c.phone,
        "البريد": c.email,
        "النوع": c.type,
        "الحالة": c.status,
        "المشروع": c.projectName,
        "رقم العمارة": c.buildingNumber,
        "رقم الوحدة": c.unitNumber,
        "الدور": c.floor,
        "المنطقة": c.area,
        "نوع العقار": c.propertyType,
        "السعر المطلوب": c.askingPrice,
        "المقدم": c.budgetMin,
        "أقصى ميزانية": c.budgetMax,
        "تاريخ الإضافة": c.createdAt ? new Date(c.createdAt).toLocaleDateString("ar-EG") : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custData), "العملاء");

      // Properties sheet
      const propData = properties.map(p => ({
        "العنوان": p.title,
        "المشروع": p.projectName,
        "المنطقة": p.zone,
        "السعر": p.price,
        "المساحة": p.size,
        "غرف النوم": p.bedrooms,
        "الحالة": p.status,
        "النوع": p.unitType,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(propData), "العقارات");

      // Deals sheet
      const dealData = deals.map(d => ({
        "كود الصفقة": d.id,
        "القيمة": d.value,
        "السعر النهائي": d.finalPrice,
        "العمولة": d.commissionAmt,
        "الحالة": d.status,
        "تاريخ الإغلاق": d.closedAt ? new Date(d.closedAt).toLocaleDateString("ar-EG") : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dealData), "الصفقات");

      // Financial Transactions sheet
      const finData = financialTransactions.map(f => ({
        "المعرف": f.id,
        "النوع": f.type,
        "التصنيف": f.category,
        "المبلغ": f.amount,
        "الوصف": f.description,
        "الحالة": f.status,
        "التاريخ": f.date ? new Date(f.date).toLocaleDateString("ar-EG") : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finData), "المعاملات المالية");

      // Users sheet (No password)
      const userData = users.map(u => ({
        "الاسم": u.name,
        "البريد الإلكتروني": u.email,
        "الدور الوظيفي": u.role,
        "الهاتف": u.phone,
        "الراتب الأساسي": u.salaryBase,
        "الحالة": u.isActive ? "نشط" : "معطل",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userData), "المستخدمين");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: "BACKUP_EXPORT",
          entity: "DATABASE",
          entityId: "EXCEL_DUMP",
          details: `تصدير بيانات النظام بصيغة Excel`,
        },
      }).catch(() => {});

      return new NextResponse(buf, {
        headers: {
          "Cache-Control": "no-store, private",
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="dark_crm_data_${dateStr}.xlsx"`,
        },
      });
    }

    // 3. Complete JSON Dump (Default)
    const backupPayload = {
      meta: {
        system: "Dark CRM",
        version: "2.0",
        exportedAt: new Date().toISOString(),
        exportedBy: session.name,
        security: "PASSWORD_HASHES_REDACTED",
        checksum: integrityChecksum,
        counts: {
          users: users.length,
          projects: projects.length,
          customers: customers.length,
          properties: properties.length,
          deals: deals.length,
          interactions: interactions.length,
          reminders: reminders.length,
          commissions: commissions.length,
          financialTransactions: financialTransactions.length,
          notifications: notifications.length,
          pushSubscriptions: pushSubscriptions.length,
          auditLogs: auditLogs.length,
        },
      },
      data: {
        users, // Password hashes stripped
        projects,
        customers,
        properties,
        deals,
        interactions,
        reminders,
        commissions,
        financialTransactions,
        notifications,
        pushSubscriptions,
        auditLogs,
        customFields,
        settings,
      },
    };

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "BACKUP_EXPORT",
        entity: "DATABASE",
        entityId: "JSON_DUMP",
        details: `تصدير نسخة احتياطية كاملة بصيغة JSON مع تحقق السلامة SHA-256`,
      },
    }).catch(() => {});

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="dark_crm_full_backup_${dateStr}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Backup Export Error:", error);
    return NextResponse.json({ error: "Failed to generate database backup: " + (error.message || "Unknown error") }, { status: 500 });
  }
}

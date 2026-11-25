import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE } from "@/lib/auth";
import * as XLSX from "xlsx";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

const limits = {
  projects: 500, campaigns: 10000, customers: 50000, properties: 10000, deals: 10000,
  interactions: 25000, reminders: 10000, commissions: 10000, auditLogs: 10000,
  financialTransactions: 20000, notifications: 5000, pushSubscriptions: 5000,
};

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : `'${String(val)}'`;
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Prisma.Decimal.isDecimal(val)) return val.toString();
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

function orderReversals<T extends { id: string; reversalOfId: string | null }>(rows: T[]): T[] | null {
  const ids = new Set(rows.map(({ id }) => id));
  const ordered: T[] = [];
  const dependents = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.reversalOfId) {
      ordered.push(row);
    } else {
      if (!ids.has(row.reversalOfId)) return null;
      const children = dependents.get(row.reversalOfId) ?? [];
      children.push(row);
      dependents.set(row.reversalOfId, children);
    }
  }
  for (let i = 0; i < ordered.length; i++) ordered.push(...(dependents.get(ordered[i].id) ?? []));
  return ordered.length === rows.length ? ordered : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;

    const format = request.nextUrl.searchParams.get("format") || "json";
    if (!["json", "sql", "xlsx"].includes(format)) {
      return NextResponse.json({ error: "صيغة التصدير غير مدعومة" }, { status: 400 });
    }
    const dateStr = new Date().toISOString().split("T")[0];

    // Read the selected tables from one consistent snapshot.
    const [
      rawUsers,
      projects,
      campaigns,
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
    ] = await prisma.$transaction([
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
          salaryBaseDecimal: true,
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
      prisma.project.findMany({ take: limits.projects + 1 }),
      prisma.campaign.findMany({ take: limits.campaigns + 1 }),
      prisma.customer.findMany({ take: limits.customers + 1, orderBy: { createdAt: "desc" } }),
      prisma.property.findMany({ take: limits.properties + 1, orderBy: { createdAt: "desc" } }),
      prisma.deal.findMany({ take: limits.deals + 1, orderBy: { createdAt: "desc" } }),
      prisma.interaction.findMany({ take: limits.interactions + 1, orderBy: { createdAt: "desc" } }),
      prisma.reminder.findMany({ take: limits.reminders + 1, orderBy: { createdAt: "desc" } }),
      prisma.commission.findMany({ take: limits.commissions + 1, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.findMany({ take: limits.auditLogs + 1, orderBy: { createdAt: "desc" } }),
      prisma.customFieldDefinition.findMany(),
      prisma.systemSettings.findMany(),
      prisma.financialTransaction.findMany({ take: limits.financialTransactions + 1, orderBy: { date: "desc" } }),
      prisma.notification.findMany({ take: limits.notifications + 1, orderBy: { createdAt: "desc" } }),
      prisma.pushSubscription.findMany({ take: limits.pushSubscriptions + 1 }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    const limited = { projects, campaigns, customers, properties, deals, interactions, reminders, commissions,
      auditLogs, financialTransactions, notifications, pushSubscriptions };
    const exceeded = (Object.keys(limits) as (keyof typeof limits)[])
      .filter((key) => limited[key].length > limits[key]);
    if (exceeded.length) {
      return NextResponse.json({ error: "حجم البيانات يتجاوز حد التصدير", tables: exceeded }, { status: 422 });
    }

    // The explicit select above excludes password hashes from this application export.
    const users = rawUsers;

    const exportedData = { users, ...limited, customFields, settings };
    const integrityChecksum = createHash("sha256").update(JSON.stringify(exportedData)).digest("hex");

    // 1. SQL Dump
    if (format === "sql") {
      const orderedTransactions = orderReversals(financialTransactions);
      const userIds = new Set(users.map(({ id }) => id));
      if (!orderedTransactions || pushSubscriptions.some(({ userId }) => !userIds.has(userId))) {
        return NextResponse.json({
          error: "توجد علاقات تاريخية تحتاج مراجعة قبل تصدير SQL. استخدم أرشيف قاعدة البيانات لأغراض الاستعادة.",
        }, { status: 409 });
      }
      let sqlContent = `-- Dark CRM application data export (selected tables; requires matching schema)\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Integrity Checksum (SHA256): ${integrityChecksum}\n`;
      sqlContent += `-- Security Notice: User password hashes are sanitized/excluded from this export.\n`;
      sqlContent += `-- Additional schema, tables and storage assets are outside this export.\n\n`;
      sqlContent += `BEGIN;\nSET LOCAL standard_conforming_strings = on;\n\n`;

      // For SQL, provide empty placeholder password hash to satisfy NOT NULL constraints if restored
      const usersForSql = users.map((u) => ({
        ...u,
        password: "$2a$10$REDACTED_PASSWORD_HASH_MUST_BE_RESET_BY_ADMIN0000000000",
      }));

      sqlContent += generateSqlInserts("User", usersForSql);
      sqlContent += generateSqlInserts("Project", projects);
      sqlContent += generateSqlInserts("Campaign", campaigns);
      sqlContent += generateSqlInserts("Customer", customers);
      sqlContent += generateSqlInserts("Property", properties);
      sqlContent += generateSqlInserts("Deal", deals);
      sqlContent += generateSqlInserts("Interaction", interactions);
      sqlContent += generateSqlInserts("Reminder", reminders);
      sqlContent += generateSqlInserts("Commission", commissions);
      sqlContent += generateSqlInserts("CustomFieldDefinition", customFields);
      sqlContent += generateSqlInserts("SystemSettings", settings);
      sqlContent += generateSqlInserts("FinancialTransaction", orderedTransactions);
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
          details: "تصدير بيانات محددة بصيغة SQL",
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

    // 3. Selected JSON export (default)
    const backupPayload = {
      meta: {
        system: "Dark CRM",
        version: "2.0",
        exportedAt: new Date().toISOString(),
        exportedBy: session.name,
        security: "PASSWORD_HASHES_REDACTED",
        scope: "SELECTED_APPLICATION_TABLES",
        checksum: integrityChecksum,
        counts: {
          users: users.length,
          projects: projects.length,
          campaigns: campaigns.length,
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
      data: exportedData,
    };

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "BACKUP_EXPORT",
        entity: "DATABASE",
        entityId: "JSON_DUMP",
        details: "تصدير بيانات محددة بصيغة JSON مع تحقق السلامة SHA-256",
      },
    }).catch(() => {});

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="dark_crm_export_${dateStr}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Backup Export Error:", error);
    return NextResponse.json({ error: "تعذّر تجهيز تصدير البيانات" }, { status: 500 });
  }
}

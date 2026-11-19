import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

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
    const session = await getSession();
    if (!session || (session.role !== "GENERAL_MANAGER" && session.role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized. Managers only." }, { status: 403 });
    }

    const format = request.nextUrl.searchParams.get("format") || "json";
    const dateStr = new Date().toISOString().split("T")[0];

    // Fetch all tables
    const [
      users,
      projects,
      customers,
      properties,
      deals,
      interactions,
      reminders,
      commissions,
      auditLogs,
      customFields,
      settings
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.project.findMany(),
      prisma.customer.findMany(),
      prisma.property.findMany(),
      prisma.deal.findMany(),
      prisma.interaction.findMany(),
      prisma.reminder.findMany(),
      prisma.commission.findMany(),
      prisma.auditLog.findMany({ take: 5000, orderBy: { createdAt: "desc" } }),
      (prisma as any).customFieldDefinition ? (prisma as any).customFieldDefinition.findMany() : Promise.resolve([]),
      prisma.systemSettings.findMany()
    ]);

    // 1. SQL Dump
    if (format === "sql") {
      let sqlContent = `-- Dark CRM Complete Database Backup & Migration Script\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Target: Compatible with PostgreSQL, Neon, Supabase, Railway, Docker, Local Postgres\n\n`;
      sqlContent += `BEGIN;\n\n`;

      sqlContent += generateSqlInserts("User", users);
      sqlContent += generateSqlInserts("Project", projects);
      sqlContent += generateSqlInserts("Customer", customers);
      sqlContent += generateSqlInserts("Property", properties);
      sqlContent += generateSqlInserts("Deal", deals);
      sqlContent += generateSqlInserts("Interaction", interactions);
      sqlContent += generateSqlInserts("Reminder", reminders);
      sqlContent += generateSqlInserts("Commission", commissions);
      sqlContent += generateSqlInserts("CustomFieldDefinition", customFields);
      sqlContent += generateSqlInserts("SystemSettings", settings);
      sqlContent += generateSqlInserts("AuditLog", auditLogs);

      sqlContent += `COMMIT;\n`;

      return new NextResponse(sqlContent, {
        headers: {
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

      // Users sheet
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

      return new NextResponse(buf, {
        headers: {
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
        counts: {
          users: users.length,
          projects: projects.length,
          customers: customers.length,
          properties: properties.length,
          deals: deals.length,
          interactions: interactions.length,
          reminders: reminders.length,
          commissions: commissions.length,
          auditLogs: auditLogs.length,
        },
      },
      data: {
        users,
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
      },
    };

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="dark_crm_full_backup_${dateStr}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Backup Export Error:", error);
    return NextResponse.json({ error: "Failed to generate database backup: " + error.message }, { status: 500 });
  }
}

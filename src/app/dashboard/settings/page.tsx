import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (session?.role !== "GENERAL_MANAGER") {
    redirect("/dashboard");
    return null;
  }

  let settings = await prisma.systemSettings.findUnique({
    where: { id: "GLOBAL" }
  });

  if (!settings) {
    settings = await prisma.systemSettings.upsert({
      where: { id: "GLOBAL" },
      create: { id: "GLOBAL" },
      update: {},
    });
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ إعدادات النظام</div>
          <div className="page-subtitle">تحكم في تفعيل وتعطيل خواص المنصة حسب احتياج فريقك</div>
        </div>
      </div>
      
      <SettingsClient initialSettings={settings} />
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="logout-action-btn"
      title="تسجيل الخروج من النظام"
    >
      <LogOut size={16} />
      <span>تسجيل خروج</span>
    </button>
  );
}

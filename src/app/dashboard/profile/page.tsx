import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileClient from "@/app/dashboard/profile/ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationalId: true,
      address: true,
      birthDate: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      bankAccountDetails: true,
      qualification: true,
      experience: true,
      dateJoined: true,
      salaryBase: true,
      profileCompleted: true,
      role: true
    }
  });

  if (!user) redirect("/login");

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">ملفي الشخصي (ملف الموظف)</h1>
          <p className="page-subtitle">قم بإكمال بياناتك الشخصية وتغيير كلمة المرور</p>
        </div>
      </div>
      <ProfileClient initialUser={user} />
    </div>
  );
}

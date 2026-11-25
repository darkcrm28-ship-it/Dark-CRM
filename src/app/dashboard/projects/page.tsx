import { prisma } from "@/lib/db";
import { getPageSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getPageSession();
  if (session?.role !== "GENERAL_MANAGER" && session?.role !== "SALES_MANAGER") {
    redirect("/dashboard");
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { customers: true }
      }
    }
  });

  return <ProjectsClient initialProjects={projects} />;
}

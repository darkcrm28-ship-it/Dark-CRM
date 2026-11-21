import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, SALES_ROLES, SALES_MANAGER_ROLES } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { customers: true }
        }
      }
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;

    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

    const project = await prisma.project.create({
      data: { name, description }
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

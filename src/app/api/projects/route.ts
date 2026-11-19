import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
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
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER" && session?.role !== "SALES_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

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

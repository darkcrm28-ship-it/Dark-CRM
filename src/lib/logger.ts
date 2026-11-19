import { prisma } from "./db";

export async function logAction({
  userId,
  action,
  entity,
  entityId,
  details
}: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || "N/A",
        details
      }
    });
  } catch (error) {
    console.error("Logger Error:", error);
  }
}

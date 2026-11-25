import type { AppRole, Session } from "@/lib/auth";
import {
  FINANCE_ROLES,
  ROLE,
  SALES_MANAGER_ROLES,
  SALES_ROLES,
} from "@/lib/auth";
import { scopedCustomerWhere, scopedDealWhere } from "@/lib/access-scope";
import { prisma } from "@/lib/db";

export const DOCUMENT_ENTITY_TYPES = [
  "PROPERTY",
  "OWNER",
  "PROPERTY_OWNER",
  "CUSTOMER",
  "DEAL",
  "RESERVATION",
  "CONTRACT",
  "PAYMENT",
  "INSTALLMENT",
] as const;

export const DOCUMENT_TYPES = [
  "OWNERSHIP_PROOF",
  "TITLE_DEED",
  "IDENTIFICATION",
  "CONTRACT",
  "RECEIPT",
  "INVOICE",
  "VALUATION",
  "OTHER",
] as const;

export const DOCUMENT_ACCESS_LEVELS = ["INTERNAL", "RESTRICTED", "CONFIDENTIAL"] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type DocumentAccessLevel = (typeof DOCUMENT_ACCESS_LEVELS)[number];

const MANAGER_OR_FINANCE: readonly AppRole[] = [
  ROLE.GENERAL_MANAGER,
  ROLE.SALES_MANAGER,
  ROLE.ACCOUNTING_MANAGER,
];

const readRoles: Record<DocumentEntityType, readonly AppRole[]> = {
  PROPERTY: [...SALES_ROLES, ...FINANCE_ROLES],
  OWNER: SALES_MANAGER_ROLES,
  PROPERTY_OWNER: SALES_MANAGER_ROLES,
  CUSTOMER: SALES_ROLES,
  DEAL: SALES_ROLES,
  RESERVATION: [...SALES_MANAGER_ROLES, ...FINANCE_ROLES],
  CONTRACT: [...SALES_MANAGER_ROLES, ...FINANCE_ROLES],
  PAYMENT: [...FINANCE_ROLES, ROLE.GENERAL_MANAGER],
  INSTALLMENT: [...FINANCE_ROLES, ROLE.GENERAL_MANAGER],
};

const writeRoles: Record<DocumentEntityType, readonly AppRole[]> = {
  PROPERTY: SALES_MANAGER_ROLES,
  OWNER: SALES_MANAGER_ROLES,
  PROPERTY_OWNER: SALES_MANAGER_ROLES,
  CUSTOMER: SALES_ROLES,
  DEAL: SALES_ROLES,
  RESERVATION: SALES_MANAGER_ROLES,
  CONTRACT: SALES_MANAGER_ROLES,
  PAYMENT: [...FINANCE_ROLES, ROLE.GENERAL_MANAGER],
  INSTALLMENT: [...FINANCE_ROLES, ROLE.GENERAL_MANAGER],
};

export function isDocumentEntityType(value: unknown): value is DocumentEntityType {
  return typeof value === "string" && (DOCUMENT_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function isDocumentAccessLevel(value: unknown): value is DocumentAccessLevel {
  return typeof value === "string" && (DOCUMENT_ACCESS_LEVELS as readonly string[]).includes(value);
}

function canReadConfidential(role: AppRole): boolean {
  return MANAGER_OR_FINANCE.includes(role);
}

async function entityExists(
  entityType: DocumentEntityType,
  entityId: string,
  session: Session
): Promise<boolean> {
  switch (entityType) {
    case "CUSTOMER": {
      const row = await prisma.customer.findFirst({
        where: scopedCustomerWhere(session, { id: entityId }),
        select: { id: true },
      });
      return Boolean(row);
    }
    case "DEAL": {
      const row = await prisma.deal.findFirst({
        where: scopedDealWhere(session, { id: entityId }),
        select: { id: true },
      });
      return Boolean(row);
    }
    case "PROPERTY":
      return Boolean(await prisma.property.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "OWNER":
      return Boolean(await prisma.owner.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "PROPERTY_OWNER":
      return Boolean(await prisma.propertyOwner.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "RESERVATION":
      return Boolean(await prisma.reservation.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "CONTRACT":
      return Boolean(await prisma.contract.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "PAYMENT":
      return Boolean(await prisma.payment.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "INSTALLMENT":
      return Boolean(await prisma.installment.findUnique({ where: { id: entityId }, select: { id: true } }));
    default:
      return false;
  }
}

export async function canAccessDocument(
  session: Session,
  input: {
    entityType: string;
    entityId: string;
    accessLevel?: string;
    action: "read" | "write";
  }
): Promise<boolean> {
  if (!isDocumentEntityType(input.entityType) || !input.entityId) return false;

  const roles = input.action === "read" ? readRoles[input.entityType] : writeRoles[input.entityType];
  if (!roles.includes(session.role)) return false;
  if (input.accessLevel === "CONFIDENTIAL" && !canReadConfidential(session.role)) return false;

  return entityExists(input.entityType, input.entityId, session);
}

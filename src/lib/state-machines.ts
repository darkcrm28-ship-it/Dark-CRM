/**
 * State machines for core CRM entities.
 *
 * Purpose: replace free-form status strings with explicit transitions,
 * mandatory reasons, and a consistent history event shape.
 *
 * This module is additive and does not change the database schema by itself.
 * To persist history, add an entity-specific history table or a generic
 * StatusHistory model in a future migration.
 */

export type StatusTransition = {
  from: string;
  to: string;
  reasonRequired?: boolean;
  roles?: string[];
  systemOnly?: boolean;
};

export type StatusHistoryEvent = {
  entity: "Property" | "Deal" | "Customer" | "Reminder" | "Commission" | "FinancialTransaction";
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  actorType: "USER" | "SYSTEM";
  actorId: string | null;
  createdAt: Date;
  meta?: Record<string, unknown>;
};

export class InvalidStatusTransitionError extends Error {
  readonly code = "INVALID_STATUS_TRANSITION";

  constructor(
    public readonly entity: StatusHistoryEvent["entity"],
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid ${entity} status transition: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class StatusReasonRequiredError extends Error {
  readonly code = "STATUS_REASON_REQUIRED";

  constructor(
    public readonly entity: StatusHistoryEvent["entity"],
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Reason is required for ${entity} status transition: ${from} -> ${to}`);
    this.name = "StatusReasonRequiredError";
  }
}

const normalize = (value: string) => value.trim().toUpperCase();

function makeIndex(transitions: StatusTransition[]) {
  const index = new Map<string, StatusTransition>();
  for (const t of transitions) {
    index.set(`${normalize(t.from)}=>${normalize(t.to)}`, {
      ...t,
      from: normalize(t.from),
      to: normalize(t.to),
    });
  }
  return index;
}

export const PROPERTY_STATUS_TRANSITIONS: StatusTransition[] = [
  { from: "AVAILABLE", to: "RESERVED", reasonRequired: true },
  { from: "AVAILABLE", to: "SOLD", reasonRequired: true },
  { from: "AVAILABLE", to: "HIDDEN", reasonRequired: true },
  { from: "RESERVED", to: "AVAILABLE", reasonRequired: true },
  { from: "RESERVED", to: "SOLD", reasonRequired: true },
  { from: "RESERVED", to: "CANCELLED", reasonRequired: true },
  { from: "SOLD", to: "AVAILABLE", reasonRequired: true, roles: ["GENERAL_MANAGER"] },
  { from: "HIDDEN", to: "AVAILABLE", reasonRequired: true },
  { from: "CANCELLED", to: "AVAILABLE", reasonRequired: true },
];

export const DEAL_STATUS_TRANSITIONS: StatusTransition[] = [
  { from: "PENDING", to: "NEGOTIATION", reasonRequired: false },
  { from: "PENDING", to: "COMPLETED", reasonRequired: true },
  { from: "PENDING", to: "CANCELLED", reasonRequired: true },
  { from: "NEGOTIATION", to: "COMPLETED", reasonRequired: true },
  { from: "NEGOTIATION", to: "CANCELLED", reasonRequired: true },
  { from: "COMPLETED", to: "CANCELLED", reasonRequired: true, roles: ["GENERAL_MANAGER"] },
];

export const CUSTOMER_STATUS_TRANSITIONS: StatusTransition[] = [
  { from: "NEW", to: "CONTACTED", reasonRequired: false },
  { from: "CONTACTED", to: "NEGOTIATION", reasonRequired: false },
  { from: "NEGOTIATION", to: "COMPLETED", reasonRequired: true },
  { from: "NEGOTIATION", to: "LOST", reasonRequired: true },
  { from: "CONTACTED", to: "LOST", reasonRequired: true },
  { from: "NEW", to: "LOST", reasonRequired: true },
  { from: "LOST", to: "CONTACTED", reasonRequired: true },
];

export const REMINDER_STATUS_TRANSITIONS: StatusTransition[] = [
  { from: "PENDING", to: "DONE", reasonRequired: false },
  { from: "PENDING", to: "CANCELLED", reasonRequired: true },
  { from: "DONE", to: "PENDING", reasonRequired: true },
];

export const COMMISSION_STATUS_TRANSITIONS: StatusTransition[] = [
  { from: "PENDING", to: "APPROVED", reasonRequired: false },
  { from: "PENDING", to: "REJECTED", reasonRequired: true },
  { from: "APPROVED", to: "PAID", reasonRequired: false },
  { from: "APPROVED", to: "REJECTED", reasonRequired: true, roles: ["GENERAL_MANAGER", "ACCOUNTING_MANAGER"] },
];

export const FINANCIAL_TRANSACTION_STATUS_TRANSITIONS: StatusTransition[] = [
  { from: "COMPLETED", to: "REVERSED", reasonRequired: true, roles: ["GENERAL_MANAGER", "ACCOUNTING_MANAGER"] },
  { from: "PENDING", to: "COMPLETED", reasonRequired: false },
  { from: "PENDING", to: "CANCELLED", reasonRequired: true },
];

const TRANSITIONS_BY_ENTITY: Record<StatusHistoryEvent["entity"], Map<string, StatusTransition>> = {
  Property: makeIndex(PROPERTY_STATUS_TRANSITIONS),
  Deal: makeIndex(DEAL_STATUS_TRANSITIONS),
  Customer: makeIndex(CUSTOMER_STATUS_TRANSITIONS),
  Reminder: makeIndex(REMINDER_STATUS_TRANSITIONS),
  Commission: makeIndex(COMMISSION_STATUS_TRANSITIONS),
  FinancialTransaction: makeIndex(FINANCIAL_TRANSACTION_STATUS_TRANSITIONS),
};

export function canTransition(
  entity: StatusHistoryEvent["entity"],
  from: string,
  to: string,
): boolean {
  return TRANSITIONS_BY_ENTITY[entity].has(`${normalize(from)}=>${normalize(to)}`);
}

export function assertTransition(input: {
  entity: StatusHistoryEvent["entity"];
  from: string;
  to: string;
  reason?: string | null;
  actorRole?: string | null;
  actorType?: "USER" | "SYSTEM";
}) {
  const from = normalize(input.from);
  const to = normalize(input.to);
  if (from === to) return { from, to, transition: null as StatusTransition | null };

  const transition = TRANSITIONS_BY_ENTITY[input.entity].get(`${from}=>${to}`);
  if (!transition) throw new InvalidStatusTransitionError(input.entity, from, to);

  if (transition.systemOnly && input.actorType !== "SYSTEM") {
    throw new InvalidStatusTransitionError(input.entity, from, to);
  }

  if (transition.roles?.length) {
    const role = normalize(input.actorRole ?? "");
    const allowed = transition.roles.map(normalize).includes(role);
    if (!allowed) throw new InvalidStatusTransitionError(input.entity, from, to);
  }

  if (transition.reasonRequired && !String(input.reason ?? "").trim()) {
    throw new StatusReasonRequiredError(input.entity, from, to);
  }

  return { from, to, transition };
}

export function buildStatusHistoryEvent(input: {
  entity: StatusHistoryEvent["entity"];
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string | null;
  actorType: "USER" | "SYSTEM";
  actorId?: string | null;
  meta?: Record<string, unknown>;
}): StatusHistoryEvent {
  return {
    entity: input.entity,
    entityId: input.entityId,
    fromStatus: input.fromStatus ? normalize(input.fromStatus) : null,
    toStatus: normalize(input.toStatus),
    reason: input.reason?.trim() ? input.reason.trim() : null,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    createdAt: new Date(),
    meta: input.meta,
  };
}

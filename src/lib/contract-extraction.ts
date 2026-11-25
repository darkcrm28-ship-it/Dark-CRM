/**
 * Contract extraction review workflow (reference implementation).
 *
 * Flow: upload/source -> AI extraction -> human review -> approved apply.
 * AI output must never be written directly to financial/contract records.
 */

export type ExtractionStatus = "PENDING" | "RUNNING" | "READY" | "FAILED" | "APPROVED" | "REJECTED" | "APPLIED";

export type ExtractedField<T = string | number | null> = {
  field: string;
  value: T;
  confidence: number; // 0..1
  page?: number | null;
  quote?: string | null;
  source?: string | null;
};

export type ContractExtractionDraft = {
  id: string;
  dealId?: string | null;
  customerId?: string | null;
  propertyId?: string | null;
  sourceDocumentId?: string | null;
  status: ExtractionStatus;
  model?: string | null;
  fields: ExtractedField[];
  rawText?: string | null;
  error?: string | null;
  createdById?: string | null;
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  appliedAt?: Date | null;
};

export const CONTRACT_EXTRACTION_FIELDS = [
  "contractDate",
  "totalPrice",
  "downPayment",
  "installmentCount",
  "installmentAmount",
  "installmentFrequency",
  "buyerName",
  "sellerName",
  "unitNumber",
  "projectName",
  "notes",
] as const;

export type ContractExtractionFieldName = (typeof CONTRACT_EXTRACTION_FIELDS)[number];

export function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function canApplyExtraction(extraction: Pick<ContractExtractionDraft, "status">): boolean {
  return extraction.status === "APPROVED";
}

export function validateExtractionForApply(extraction: ContractExtractionDraft): string[] {
  const errors: string[] = [];
  if (extraction.status !== "APPROVED") errors.push("Extraction must be approved before apply");
  if (!extraction.reviewedById) errors.push("reviewedById is required");
  if (!extraction.fields.length) errors.push("At least one extracted field is required");

  for (const f of extraction.fields) {
    if (!f.field) errors.push("Every field must have a name");
    if (f.confidence < 0 || f.confidence > 1) errors.push(`Invalid confidence for ${f.field}`);
  }
  return errors;
}

export type ApplyExtractionResult = {
  applied: boolean;
  entityType: "Contract" | "Deal" | "PaymentPlan";
  entityId: string;
  appliedFields: string[];
  skippedFields: string[];
};

import crypto from "crypto";

export type WhatsAppMessageStatus =
  | "PROVIDER_ACCEPTED"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "UNKNOWN";

export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
}

// In-memory replay cache with 15-minute TTL to prevent webhook replay attacks
const processedMessageIds = new Map<string, number>();
const REPLAY_WINDOW_MS = 15 * 60 * 1000;

function pruneReplayCache() {
  const now = Date.now();
  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > REPLAY_WINDOW_MS) {
      processedMessageIds.delete(id);
    }
  }
}

/**
 * Validates Meta webhook signature using HMAC SHA-256 over raw payload bytes.
 * X-Hub-Signature-256: sha256=<hex_digest>
 */
export function validateMetaWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  appSecret: string
): WebhookValidationResult {
  if (!signatureHeader) {
    return { isValid: false, reason: "Missing X-Hub-Signature-256 header." };
  }

  if (!appSecret) {
    return { isValid: false, reason: "App secret is not configured in environment." };
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return { isValid: false, reason: "Invalid signature header format; expected sha256=..." };
  }

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody);
  const actualSignature = hmac.digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(actualSignature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return { isValid: false, reason: "Signature length mismatch." };
  }

  const matches = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  if (!matches) {
    return { isValid: false, reason: "Cryptographic signature verification failed." };
  }

  return { isValid: true };
}

/**
 * Checks for duplicate/replayed webhook delivery.
 */
export function isDuplicateWebhookEvent(eventId: string): boolean {
  pruneReplayCache();
  if (processedMessageIds.has(eventId)) {
    return true;
  }
  processedMessageIds.set(eventId, Date.now());
  return false;
}

/**
 * AI Safety Guardrails:
 * Restricts autonomous AI actions. Critical commercial actions (discounts, legal commitments,
 * price modifications, contract clauses) CANNOT be authorized by AI regardless of confidence score.
 */
export interface ActionAuthorizationCheck {
  authorized: boolean;
  requiresHumanApproval: boolean;
  reason?: string;
}

const RESTRICTED_ACTIONS = [
  "APPLY_DISCOUNT",
  "PROMISE_AVAILABILITY",
  "MODIFY_PAYMENT_TERMS",
  "SIGN_CONTRACT",
  "CONFIRM_LEGAL_COMMITMENT",
  "CANCEL_DEAL",
  "TRANSFER_PROPERTY",
] as const;

export type SensitiveBusinessAction = (typeof RESTRICTED_ACTIONS)[number];

export function verifyActionSafety(
  action: string,
  aiConfidence: number,
  isHumanSupervised = false
): ActionAuthorizationCheck {
  const isRestricted = (RESTRICTED_ACTIONS as readonly string[]).includes(action);

  if (isRestricted && !isHumanSupervised) {
    return {
      authorized: false,
      requiresHumanApproval: true,
      reason: `الإجراء '${action}' إجراء تجاري حساس يتطلب موافقة بشرية (المدير العام أو مدير المبيعات) ولا يجوز تفويضه للذكاء الاصطناعي أياً كانت نسبة الثقة (${(aiConfidence * 100).toFixed(1)}%).`,
    };
  }

  // Minimum threshold for standard informational tasks
  if (aiConfidence < 0.75) {
    return {
      authorized: false,
      requiresHumanApproval: true,
      reason: `نسبة الثقة (${(aiConfidence * 100).toFixed(1)}%) أقل من الحد الأدنى المقبول (75%). يرجى مراجعة موظف المبيعات.`,
    };
  }

  return { authorized: true, requiresHumanApproval: false };
}

/**
 * Emergency AI Kill Switch State
 */
let aiEmergencyKillSwitchActive = false;

export function setAiEmergencyKillSwitch(active: boolean) {
  aiEmergencyKillSwitchActive = active;
}

export function isAiKillSwitchActive(): boolean {
  return aiEmergencyKillSwitchActive;
}

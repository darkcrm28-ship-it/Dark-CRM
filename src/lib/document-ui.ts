export const DOCUMENT_TYPE_OPTIONS = [
  { value: "IDENTIFICATION", label: "مستند تعريف" },
  { value: "OWNERSHIP_PROOF", label: "إثبات ملكية" },
  { value: "TITLE_DEED", label: "صك" },
  { value: "CONTRACT", label: "عقد" },
  { value: "RECEIPT", label: "إيصال" },
  { value: "INVOICE", label: "فاتورة" },
  { value: "VALUATION", label: "تقييم" },
  { value: "OTHER", label: "أخرى" },
];

export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((item) => [item.value, item.label])
);

export const ACCESS_LABELS: Record<string, string> = {
  INTERNAL: "داخلي",
  RESTRICTED: "مقيّد",
  CONFIDENTIAL: "سري",
};

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
}

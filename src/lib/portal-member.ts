import { cookies } from "next/headers";
import { decrypt } from "./session-token";

export async function portalMemberId() {
  const token = (await cookies()).get("darak-visitor")?.value;
  if (!token) return null;
  try {
    const payload = await decrypt(token);
    return payload.aud === "darak-property-portal" && typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}

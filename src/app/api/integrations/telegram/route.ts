import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";

// Telegram integration: authenticated internal notification sender.
// - Requires a valid session with a managerial role.
// - Sanitizes message to prevent HTML injection.
// - Caps message length.
// - Never returns the bot token in the response or logs.

const MAX_MESSAGE_LENGTH = 4000;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & authorization — no session = reject.
    const session = await requireManager();
    if (session instanceof NextResponse) return session;

    const body = await req.json().catch(() => ({}));
    const rawMessage = body?.message;

    if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // 2. Sanitize: escape HTML to prevent injection; cap length.
    const safeMessage = escapeHtml(rawMessage.trim()).slice(0, MAX_MESSAGE_LENGTH);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: "Telegram credentials not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: safeMessage,
        parse_mode: "HTML",
      }),
    });

    // 3. Do not echo back the bot token or any secret. Only return ok status.
    const data = await response.json().catch(() => ({ ok: false }));

    if (!response.ok) {
      // Log a redacted reason only (never the token).
      console.warn(
        `Telegram sendMessage failed: status=${response.status} ok=${data?.ok ?? false}`
      );
      return NextResponse.json(
        { success: false, error: "Failed to send Telegram message" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: Boolean(data.ok) });
  } catch (error: any) {
    console.error("Telegram Integration Error:", error?.message || error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

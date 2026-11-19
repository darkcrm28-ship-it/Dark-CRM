/**
 * Social Media Integration Utilities
 */

// WhatsApp: Generates a direct message link
export const getWhatsAppLink = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

// Telegram: API call to send a message via Bot API
export const sendTelegramMessage = async (message: string) => {
  try {
    const response = await fetch("/api/integrations/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return await response.json();
  } catch (error) {
    console.error("Telegram error:", error);
    return { success: false, error: "Failed to send message" };
  }
};

// LinkedIn: Placeholder for fetching leads (typically via webhook or polling)
export const fetchLinkedInLeads = async () => {
  try {
    const response = await fetch("/api/integrations/linkedin/leads");
    return await response.json();
  } catch (error) {
    console.error("LinkedIn error:", error);
    return { success: false, leads: [] };
  }
};

// Twitter/X: Placeholder for checking mentions
export const checkTwitterMentions = async () => {
  try {
    const response = await fetch("/api/integrations/twitter/mentions");
    return await response.json();
  } catch (error) {
    console.error("Twitter error:", error);
    return { success: false, mentions: [] };
  }
};

/**
 * Social Media Integration Utilities
 */

// WhatsApp: Generates a direct message link
export const getWhatsAppLink = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

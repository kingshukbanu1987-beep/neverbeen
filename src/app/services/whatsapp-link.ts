/** Shared WhatsApp destination used by the website's direct-contact forms. */
export const FOUNDER_WHATSAPP_DISPLAY = '+91 90518 88116';
export const FOUNDER_WHATSAPP_DIAL = '919051888116';

/** Builds a WhatsApp chat link with a URL-encoded, prefilled message. */
export function founderWhatsAppLink(message: string): string {
  return `https://wa.me/${FOUNDER_WHATSAPP_DIAL}?text=${encodeURIComponent(message)}`;
}

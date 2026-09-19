import { parseISO } from "date-fns";

/** Yerel doğum anı; saat bilinmiyorsa eski gece yarısı varsayımı korunur. */
export function birthInstant(birthISO: string, birthTime?: string): Date {
  return parseISO(`${birthISO}T${birthTime || "00:00"}`);
}

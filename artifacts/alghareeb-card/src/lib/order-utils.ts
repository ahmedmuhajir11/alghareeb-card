/**
 * Utility functions to parse and clean Player ID, API Notes, and Receipt Links
 * from YazanCard and other provider responses.
 */

export interface ParsedOrderInfo {
  cleanTargetId: string;
  cleanNotes: string;
  receiptUrls: string[];
}

/**
 * Extracts pure Player ID, removing any appended URLs or API notes
 */
export function cleanPlayerId(rawTargetId: string | null | undefined): string {
  if (!rawTargetId) return "";
  let val = String(rawTargetId).trim();

  // Strip full URLs (http/https)
  val = val.replace(/https?:\/\/[^\s"'<>]+/gi, "").trim();

  // Strip technical UUID tags [uuid:...]
  val = val.replace(/\[uuid:[^\]]+\]/gi, "").trim();

  // Strip common Arabic prefixes like "معرف:", "معرف العملية:", "ID:"
  val = val.replace(/^(معرف(\s*العملية|\s*اللاعب|\s*العميل)?|player\s*id|id)\s*[:：\-]\s*/gi, "").trim();

  // If multiline, take the first valid line
  const lines = val.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  return lines[0] || val;
}

/**
 * Parses raw notes & targetId to extract clean notes, pure player ID,
 * and any receipt image links (e.g. img.znet.tr, cloudflare, etc.)
 */
export function parseOrderDetails(
  rawTargetId: string | null | undefined,
  rawNotes: string | null | undefined
): ParsedOrderInfo {
  const combined = `${rawTargetId || ""} ${rawNotes || ""}`;
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  const receiptUrls: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(combined)) !== null) {
    let u = match[0].trim();
    // Strip trailing punctuation often caught in regex
    u = u.replace(/[)\].,;]+$/, "");
    if (u && !receiptUrls.includes(u)) {
      receiptUrls.push(u);
    }
  }

  // Clean the player ID
  const cleanTargetId = cleanPlayerId(rawTargetId);

  // Clean the notes: strip URLs, uuid tags, and redundant technical markers
  let cleanNotes = (rawNotes || "")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "")
    .replace(/\[uuid:[^\]]+\]/gi, "")
    .replace(/معرف العملية:\s*N\/A/gi, "")
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/\s*\|\s*$/g, "")
    .replace(/^\s*\|\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    cleanTargetId,
    cleanNotes,
    receiptUrls,
  };
}

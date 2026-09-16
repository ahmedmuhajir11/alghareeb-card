/**
 * Shared helpers for determining order success/failure and extracting
 * provider-supplied account/username data from YazanCard (or similar) responses.
 *
 * IMPORTANT: "completed" is the ONLY status value that means the charge
 * actually succeeded on the provider's side, per the existing order flow
 * in orders-user.ts / webhooks.ts / yazan-sync.ts. Do not treat "pending"
 * or any other value as success — proof-of-payment must never be issued
 * for anything other than this exact status.
 */

export const ORDER_SUCCESS_STATUS = "completed";

export function isOrderSuccessful(status: string | null | undefined): boolean {
  return status === ORDER_SUCCESS_STATUS;
}

/**
 * Attempts to extract a human-readable account/username value from a
 * provider response object (e.g. YazanCard's /check response, or the
 * initial charge response's `data` object). Returns null if nothing
 * resembling a username/nickname is present — absence is NOT an error
 * and must never block or fail the charge.
 */
export function extractProviderUsername(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const candidates = [
    o.username, o.user_name, o.userName,
    o.nickname, o.nick_name, o.nickName, o.nick,
    o.player_name, o.playerName,
    o.account_name, o.accountName,
    o.game_name, o.gameName,
    o.full_name, o.fullName,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim();
    }
  }
  return null;
}

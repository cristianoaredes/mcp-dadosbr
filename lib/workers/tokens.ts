/**
 * Secure token generation utilities
 */

/**
 * Generate cryptographically secure random token
 * @param prefix - Token prefix (e.g., 'mcp', 'access', 'bearer')
 * @returns Secure random token string
 */
export function generateSecureToken(prefix: string = "mcp"): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  const token = Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${token}`;
}

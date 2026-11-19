/**
 * Which websites may send service requests from the browser (the Kiddough Shopify store).
 * Add more with ALLOWED_ORIGINS, comma-separated, e.g.
 *   ALLOWED_ORIGINS=https://kiddough-store.myshopify.com,https://*.shopifypreview.com
 */
const DEFAULT_ORIGINS = ["https://kiddough.in", "https://www.kiddough.in", "https://*.shopifypreview.com"];

export function allowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

export function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins().some((pattern) => {
    if (!pattern.includes("*")) return pattern === origin;
    // "https://*.example.com" matches any subdomain over https.
    const suffix = pattern.replace(/^https:\/\/\*/, "");
    return origin.startsWith("https://") && origin.endsWith(suffix) && origin.length > "https://".length + suffix.length;
  });
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && originAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Api-Key";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

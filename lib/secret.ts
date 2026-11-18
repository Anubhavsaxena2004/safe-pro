let warned = false;

/** The app secret used to sign sessions and tracking links. */
export function appSecret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is missing or shorter than 16 characters. Set it in your Vercel Environment Variables.");
  }
  if (!warned) {
    console.warn("[auth] AUTH_SECRET not set, using an insecure development secret.");
    warned = true;
  }
  return "dev-only-insecure-secret-change-me";
}

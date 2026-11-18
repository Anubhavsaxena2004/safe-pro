import { createHmac, timingSafeEqual } from "node:crypto";
import { appSecret } from "./secret";

/** Signed token that lets a customer open their booking's tracking page. */
export function trackToken(ref: string) {
  return createHmac("sha256", appSecret()).update(`track:${ref}`).digest("base64url").slice(0, 22);
}

export function checkTrackToken(ref: string, token: string | null | undefined) {
  if (!token) return false;
  const a = Buffer.from(trackToken(ref));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function trackUrl(ref: string) {
  return `/track/${encodeURIComponent(ref)}?t=${trackToken(ref)}`;
}

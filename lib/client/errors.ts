/**
 * Message for a failed server call. Same rule as the OTP screens: only blame the
 * connection when the device really is offline; otherwise it's a server problem.
 */
export function failureMessage(action: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Check your internet connection and try again.";
  return `We couldn't ${action} right now. Please try again in a minute.`;
}

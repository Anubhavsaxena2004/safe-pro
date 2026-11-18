export type Position = { lat: number; lng: number };

/** One GPS reading, or null if the user denies access / it times out. */
export function getPosition(timeout = 10_000): Promise<Position | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    );
  });
}

/** True only if location permission was already granted (never shows a prompt). */
export async function hasLocationPermission() {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state === "granted";
  } catch {
    return false;
  }
}

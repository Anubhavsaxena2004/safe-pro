import { ImageResponse } from "next/og";

// PNG app icons for the PWA manifest and iOS home screen (/icons/180, /icons/192, /icons/512).
// Replace with the official Kiddough logo when available.
const SIZES = ["180", "192", "512"];

export const dynamic = "force-static";

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const s = SIZES.includes(size) ? Number(size) : 192;
  const house = s * 0.5;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f766e" }}>
        <svg width={house} height={house} viewBox="0 0 64 64">
          <path d="M32 6 4 28v6h7v26h42V34h7v-6L32 6Z" fill="#ffffff" />
          <circle cx="32" cy="40" r="9" fill="#f97316" />
        </svg>
      </div>
    ),
    { width: s, height: s },
  );
}

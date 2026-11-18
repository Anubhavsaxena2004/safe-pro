import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photos are compressed in the browser before upload; this leaves headroom
    // while staying under Vercel's 4.5 MB request limit.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;

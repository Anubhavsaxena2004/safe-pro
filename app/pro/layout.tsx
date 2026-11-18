import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Safe Pro", template: "%s · Safe Pro" },
  manifest: "/pro.webmanifest",
  appleWebApp: { capable: true, title: "Safe Pro", statusBarStyle: "default" },
};

export default function ProRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { RegisterServiceWorker } from "@/components/register-sw";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kiddough Baby Proof", template: "%s · Kiddough Baby Proof" },
  description: "Home baby-proofing and child safety installation by verified Kiddough Safe Pros.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icons/180" },
  appleWebApp: { capable: true, title: "Kiddough", statusBarStyle: "default" },
  // Stop iOS from turning booking codes and OTPs into phone-number links.
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  // Matches the white app headers so the phone's status bar blends in.
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ProAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <Link href="/" className="mb-8 inline-block">
        <Logo sub="Safe Pro" />
      </Link>
      {children}
    </div>
  );
}

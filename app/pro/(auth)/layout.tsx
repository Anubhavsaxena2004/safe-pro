import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ProAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-safe pb-safe">
      <header className="flex h-14 shrink-0 items-center">
        <Link href="/" aria-label="Kiddough home">
          <Logo sub="Safe Pro" />
        </Link>
      </header>
      <main className="flex flex-1 flex-col pt-4 pb-8">{children}</main>
    </div>
  );
}

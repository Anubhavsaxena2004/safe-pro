import Link from "next/link";
import { BottomNav, LocationPing } from "@/app/pro/pro-client";
import { Logo } from "@/components/site-header";
import { requirePro } from "@/lib/auth";
import { cn, firstName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProAppLayout({ children }: { children: React.ReactNode }) {
  const pro = await requirePro();
  const approved = pro.status === "approved";

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/pro">
          <Logo sub="Safe Pro" />
        </Link>
        <Link href="/pro/profile" className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className={cn("size-2.5 rounded-full", approved && pro.is_online ? "bg-emerald-500" : "bg-slate-300")} />
          {firstName(pro.name)}
        </Link>
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
      {approved && pro.is_online && <LocationPing />}
    </div>
  );
}

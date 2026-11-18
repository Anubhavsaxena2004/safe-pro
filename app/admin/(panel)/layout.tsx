import type { Metadata } from "next";
import Link from "next/link";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminNav } from "@/app/admin/admin-nav";
import { Logo } from "@/components/site-header";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [counts] = await sql<{ pending_pros: number; unassigned: number }[]>`
    select
      (select count(*)::int from pros where status = 'pending') as pending_pros,
      (select count(*)::int from bookings where status = 'requested') as unassigned`;

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:py-5">
          <Link href="/admin">
            <Logo sub="Admin" />
          </Link>
        </div>
        <div className="px-3 pb-3 lg:flex-1">
          <AdminNav pendingPros={counts.pending_pros} unassigned={counts.unassigned} />
          <Link href="/admin/bookings/new" className="btn btn-primary mt-3 hidden w-full lg:flex">
            + New booking
          </Link>
        </div>
        <div className="hidden border-t border-slate-200 px-4 py-3 text-sm lg:block">
          <p className="truncate font-bold text-slate-700">{admin.name}</p>
          <p className="truncate text-xs text-slate-500">{admin.email}</p>
          <form action={logoutAdmin} className="mt-2">
            <button type="submit" className="text-xs font-bold text-brand-700">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
        <form action={logoutAdmin} className="mt-10 text-center lg:hidden">
          <button type="submit" className="text-sm font-bold text-slate-500">
            Log out ({admin.email})
          </button>
        </form>
      </main>
    </div>
  );
}

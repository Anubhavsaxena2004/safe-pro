import Link from "next/link";

export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-extrabold text-slate-900">Kiddough Baby Proof</span>
        {sub && <span className="block text-xs font-bold text-brand-700">{sub}</span>}
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 pt-safe backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="min-w-0">
          <Logo />
        </Link>
        <nav className="flex shrink-0 items-center gap-1">
          <Link href="/track" className="btn btn-ghost px-3">
            Track
          </Link>
          <Link href="/book" className="btn btn-primary px-4">
            Book
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white pb-safe">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-4 text-sm text-slate-500">
        <span>© {new Date().getFullYear()} Kiddough</span>
        <span className="-mr-2 flex">
          <Link href="/pro" className="flex min-h-11 items-center px-2 hover:text-brand-700">
            Safe Pro login
          </Link>
          <Link href="/admin" className="flex min-h-11 items-center px-2 hover:text-brand-700">
            Admin
          </Link>
        </span>
      </div>
    </footer>
  );
}

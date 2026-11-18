import Link from "next/link";

export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
      <span className="leading-tight">
        <span className="block text-base font-extrabold text-slate-900">Kiddough Baby Proof</span>
        {sub && <span className="block text-xs font-bold text-brand-700">{sub}</span>}
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-bold">
          <Link href="/track" className="btn btn-ghost px-3">
            Track
          </Link>
          <Link href="/book" className="btn btn-primary px-3">
            Book
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
        <span>© {new Date().getFullYear()} Kiddough</span>
        <span className="flex gap-4">
          <Link href="/pro" className="hover:text-brand-700">
            Safe Pro login
          </Link>
          <Link href="/admin" className="hover:text-brand-700">
            Admin
          </Link>
        </span>
      </div>
    </footer>
  );
}

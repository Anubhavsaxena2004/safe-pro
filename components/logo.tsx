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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/pros", label: "Safe Pros" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ pendingPros, unassigned }: { pendingPros: number; unassigned: number }) {
  const pathname = usePathname();
  const counts: Record<string, number> = { "/admin/pros": pendingPros, "/admin/bookings": unassigned };
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const count = counts[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap",
              active ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {item.label}
            {count > 0 && (
              <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-white/25" : "bg-amber-100 text-amber-800")}>{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

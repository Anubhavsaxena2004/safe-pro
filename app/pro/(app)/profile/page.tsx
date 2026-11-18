import type { Metadata } from "next";
import type { ReactNode } from "react";
import { logoutPro } from "@/app/pro/actions";
import { IconDownload, IconLogOut, IconShieldCheck } from "@/components/icons";
import { Card, ProStatusBadge } from "@/components/ui";
import { requirePro } from "@/lib/auth";
import { cn, fmtDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const pro = await requirePro();
  const initials = pro.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-4">
      <section className="card flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-800">{initials}</div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-slate-900">{pro.name}</h1>
          <p className="text-[15px] text-slate-600">+91 {pro.phone}</p>
          <div className="mt-1.5">
            <ProStatusBadge status={pro.status} />
          </div>
        </div>
      </section>

      <section
        className={cn(
          "card flex items-start gap-3",
          pro.aadhaar_verified ? (pro.kyc_mode === "demo" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50") : "",
        )}
      >
        <IconShieldCheck size={24} className={cn("mt-0.5 shrink-0", pro.aadhaar_verified ? "text-emerald-600" : "text-slate-400")} />
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900">
            {pro.id_type ? `${pro.id_type} ending ${pro.id_last4}` : "ID not added"}
          </p>
          <p className="text-sm text-slate-600">
            {pro.aadhaar_verified
              ? `Verified${pro.kyc_mode === "demo" ? " (demo)" : ""}${pro.aadhaar_verified_at ? ` on ${fmtDateTime(pro.aadhaar_verified_at)}` : ""}`
              : "Not verified yet"}
          </p>
        </div>
      </section>

      <Card title="Details">
        <dl className="divide-y divide-slate-100 text-[15px]">
          <Line label="City">{`${pro.city} ${pro.pincode}`}</Line>
          <Line label="Address">{pro.address}</Line>
          <Line label="Experience">{`${pro.experience_years} year${pro.experience_years === 1 ? "" : "s"}`}</Line>
          <Line label="Joined">{fmtDateTime(pro.created_at)}</Line>
        </dl>
        <p className="mt-3 text-xs text-slate-500">To change these details, please contact the Kiddough team.</p>
      </Card>

      <Card title="Install the app">
        <div className="flex gap-3">
          <IconDownload size={22} className="mt-0.5 shrink-0 text-brand-700" />
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <b className="text-slate-800">Android (Chrome):</b> tap ⋮, then <b>Install app</b> or <b>Add to Home screen</b>.
            </li>
            <li>
              <b className="text-slate-800">iPhone (Safari):</b> tap the Share button, then <b>Add to Home Screen</b>.
            </li>
          </ul>
        </div>
      </Card>

      <form action={logoutPro}>
        <button type="submit" className="btn btn-secondary btn-lg w-full text-red-600">
          <IconLogOut size={18} /> Log out
        </button>
      </form>
    </div>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right font-semibold break-words text-slate-900">{children || "—"}</dd>
    </div>
  );
}

import type { Metadata } from "next";
import { logoutPro } from "@/app/pro/actions";
import { Card, InfoList, ProStatusBadge } from "@/components/ui";
import { requirePro } from "@/lib/auth";
import { fmtDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const pro = await requirePro();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-slate-900">Profile</h1>
      <Card title={pro.name} action={<ProStatusBadge status={pro.status} />}>
        <InfoList
          items={[
            ["Mobile", pro.phone],
            ["City", `${pro.city} ${pro.pincode}`],
            ["Address", pro.address],
            ["Experience", `${pro.experience_years} year${pro.experience_years === 1 ? "" : "s"}`],
            [
              "ID",
              pro.id_type
                ? `${pro.id_type} ending ${pro.id_last4}${pro.aadhaar_verified ? ` · verified${pro.kyc_mode === "demo" ? " (demo)" : ""}` : ""}`
                : "—",
            ],
            ["Joined", fmtDateTime(pro.created_at)],
          ]}
        />
        <p className="mt-3 text-xs text-slate-500">To change these details, please contact the Kiddough team.</p>
      </Card>

      <Card title="Install the app">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            <b>Android (Chrome):</b> tap ⋮ then <b>Add to Home screen</b> / <b>Install app</b>.
          </li>
          <li>
            <b>iPhone (Safari):</b> tap the Share button then <b>Add to Home Screen</b>.
          </li>
        </ul>
      </Card>

      <form action={logoutPro}>
        <button type="submit" className="btn btn-secondary w-full">
          Log out
        </button>
      </form>
    </div>
  );
}

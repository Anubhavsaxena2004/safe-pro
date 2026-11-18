import { BottomNav, LocationPing, ProHeader } from "@/app/pro/pro-client";
import { requirePro } from "@/lib/auth";
import { firstName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProAppLayout({ children }: { children: React.ReactNode }) {
  const pro = await requirePro();
  const approved = pro.status === "approved";

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-slate-50 sm:border-x sm:border-slate-200">
      <ProHeader name={firstName(pro.name)} online={approved && pro.is_online} />
      <main className="px-4 pt-4 pb-bar">{children}</main>
      <BottomNav />
      {approved && pro.is_online && <LocationPing />}
    </div>
  );
}

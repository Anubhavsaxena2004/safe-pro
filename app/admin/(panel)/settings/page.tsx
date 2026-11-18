import type { Metadata } from "next";
import { addAdmin, addCity, changeAdminPassword, saveService, toggleCity } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { City, Service } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireAdmin();
  const [services, cities, admins] = await Promise.all([
    sql<Service[]>`select * from services order by sort_order, id`,
    sql<City[]>`select * from cities order by active desc, name`,
    sql<{ id: number; name: string; email: string; created_at: Date }[]>`select id, name, email, created_at from admins order by id`,
  ]);

  return (
    <>
      <PageTitle title="Settings" subtitle="Services, prices, cities and admin users" />

      <div className="space-y-6">
        <Card title="Services & prices">
          <p className="mb-4 text-sm text-slate-500">
            Price is what the customer pays; payout is what the Safe Pro earns. Changes apply to new bookings only.
          </p>
          <div className="space-y-3">
            {services.map((s) => (
              <ServiceForm key={s.id} service={s} />
            ))}
          </div>
          <details className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
            <summary className="cursor-pointer text-sm font-bold text-brand-700">+ Add a service</summary>
            <div className="mt-3">
              <ServiceForm />
            </div>
          </details>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Cities">
            <p className="mb-3 text-sm text-slate-500">Customers can book, and Safe Pros can register, only in active cities.</p>
            <ul className="mb-4 divide-y divide-slate-100">
              {cities.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2 font-bold">
                    {c.name} {!c.active && <Badge>Inactive</Badge>}
                  </span>
                  <ActionForm action={toggleCity}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="ghost" className="px-2 py-1 text-xs" pendingText="…">
                      {c.active ? "Deactivate" : "Activate"}
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={addCity} resetOnSuccess className="flex gap-2">
              <input name="name" required placeholder="New city, e.g. Pune" className="input" />
              <SubmitButton pendingText="Adding…">Add</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Admin users">
            <ul className="mb-4 divide-y divide-slate-100 text-sm">
              {admins.map((a) => (
                <li key={a.id} className="py-2">
                  <span className="font-bold">{a.name}</span> {a.id === me.id && <Badge tone="green">You</Badge>}
                  <div className="text-xs text-slate-500">
                    {a.email} · added {fmtDateTime(a.created_at)}
                  </div>
                </li>
              ))}
            </ul>
            <details className="rounded-xl border border-dashed border-slate-300 p-4">
              <summary className="cursor-pointer text-sm font-bold text-brand-700">+ Add an admin</summary>
              <ActionForm action={addAdmin} resetOnSuccess className="mt-3 space-y-3">
                <input name="name" required placeholder="Name" className="input" />
                <input name="email" type="email" required placeholder="Email" className="input" />
                <input name="password" type="password" required minLength={8} placeholder="Temporary password (8+ characters)" className="input" />
                <SubmitButton pendingText="Adding…">Add admin</SubmitButton>
              </ActionForm>
            </details>
            <details className="mt-3 rounded-xl border border-dashed border-slate-300 p-4">
              <summary className="cursor-pointer text-sm font-bold text-brand-700">Change my password</summary>
              <ActionForm action={changeAdminPassword} resetOnSuccess className="mt-3 space-y-3">
                <input name="current" type="password" required placeholder="Current password" autoComplete="current-password" className="input" />
                <input name="next" type="password" required minLength={8} placeholder="New password (8+ characters)" autoComplete="new-password" className="input" />
                <SubmitButton pendingText="Saving…">Change password</SubmitButton>
              </ActionForm>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}

function ServiceForm({ service }: { service?: Service }) {
  return (
    <ActionForm action={saveService} resetOnSuccess={!service} className="rounded-xl border border-slate-200 p-3">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Field label="Name">
            <input name="name" required defaultValue={service?.name} className="input" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Price (₹)">
            <input name="price" type="number" min={0} required defaultValue={service?.price ?? 0} className="input" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Payout (₹)">
            <input name="pro_payout" type="number" min={0} required defaultValue={service?.pro_payout ?? 0} className="input" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Order">
            <input name="sort_order" type="number" defaultValue={service?.sort_order ?? 0} className="input" />
          </Field>
        </div>
        <div className="flex items-end md:col-span-2">
          {service && (
            <label className="flex items-center gap-2 pb-3 text-sm font-bold">
              <input type="checkbox" name="active" defaultChecked={service.active} className="size-4 accent-brand-700" /> Active
            </label>
          )}
        </div>
        <div className="md:col-span-10">
          <input name="description" defaultValue={service?.description} placeholder="Short description shown to customers" className="input" />
        </div>
        <div className="md:col-span-2">
          <SubmitButton variant={service ? "secondary" : "primary"} className="w-full" pendingText="Saving…">
            {service ? "Save" : "Add"}
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}

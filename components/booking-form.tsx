import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import type { City, FormState, Service } from "@/lib/types";
import { inr, SLOTS, todayIST } from "@/lib/utils";

/** Admin form for requests that come in by phone or WhatsApp instead of the Kiddough website. */
export function BookingForm({
  action,
  services,
  cities,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  services: Service[];
  cities: City[];
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="label">Service</legend>
        {services.map((s, i) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 has-checked:border-brand-600 has-checked:bg-brand-50"
          >
            <input type="radio" name="service_id" value={s.id} defaultChecked={i === 0} required className="mt-0.5 size-5 shrink-0 accent-brand-700" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-extrabold text-slate-900">{s.name}</span>
                <span className="font-extrabold text-brand-800">{s.price > 0 ? inr(s.price) : "Free"}</span>
              </span>
              {s.description && <span className="mt-0.5 block text-sm text-slate-600">{s.description}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product (optional)" htmlFor="product_title">
          <input id="product_title" name="product_title" placeholder="e.g. Bed rail, safety gate" className="input" />
        </Field>
        <Field label="Shopify order no. (optional)" htmlFor="shopify_order">
          <input id="shopify_order" name="shopify_order" placeholder="e.g. 1042" className="input" />
        </Field>
        <Field label="Customer name" htmlFor="customer_name">
          <input id="customer_name" name="customer_name" required autoComplete="off" className="input" />
        </Field>
        <Field label="Mobile number" htmlFor="customer_phone">
          <input id="customer_phone" name="customer_phone" required inputMode="tel" autoComplete="off" placeholder="10-digit mobile" className="input" />
        </Field>
        <Field label="Email (optional)" htmlFor="customer_email">
          <input id="customer_email" name="customer_email" type="email" autoComplete="off" className="input" />
        </Field>
        <Field label="City" htmlFor="city">
          <select id="city" name="city" required className="input" defaultValue="">
            <option value="" disabled>
              Choose city
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Full address" htmlFor="address">
            <textarea id="address" name="address" required rows={3} placeholder="Flat / house no., building, street, landmark" className="input" />
          </Field>
        </div>
        <Field label="Pincode" htmlFor="pincode">
          <input id="pincode" name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} className="input" />
        </Field>
        <Field label="Preferred date" htmlFor="preferred_date">
          <input id="preferred_date" name="preferred_date" type="date" required min={todayIST()} max={todayIST(90)} defaultValue={todayIST(1)} className="input" />
        </Field>
      </div>

      <fieldset>
        <legend className="label">Time slot</legend>
        <div className="grid grid-cols-3 gap-2">
          {SLOTS.map((slot, i) => {
            const [name, time] = slot.label.split(" (");
            return (
              <label
                key={slot.value}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-300 bg-white px-1 text-center transition has-checked:border-brand-700 has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-100 has-focus-visible:ring-4 has-focus-visible:ring-brand-100"
              >
                <input type="radio" name="preferred_slot" value={slot.value} defaultChecked={i === 0} className="sr-only" />
                <span className="text-sm font-extrabold text-slate-900">{name}</span>
                <span className="text-xs text-slate-500">{time?.replace(")", "").replace(/\s/g, "")}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label="Notes (optional)" htmlFor="notes">
        <textarea id="notes" name="notes" rows={2} placeholder="e.g. child's age, parking, floor number" className="input" />
      </Field>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-brand-700" />
        <span>The customer agreed to the home visit and to photos of the installed products being taken.</span>
      </label>

      <SubmitButton className="btn-lg w-full sm:w-auto sm:px-8" pendingText="Creating…">
        Create booking
      </SubmitButton>
    </ActionForm>
  );
}

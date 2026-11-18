import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Logo } from "@/components/site-header";
import { Field } from "@/components/ui";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-8">
        <Logo sub="Admin" />
      </div>
      <div className="card">
        <h1 className="mb-4 text-xl font-extrabold text-slate-900">Admin login</h1>
        <ActionForm action={loginAdmin} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" required autoComplete="username" className="input" />
          </Field>
          <Field label="Password" htmlFor="password">
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </Field>
          <SubmitButton className="w-full" pendingText="Logging in…">
            Log in
          </SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}

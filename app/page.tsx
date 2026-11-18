import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";

const SERVICES = [
  {
    title: "Home Safety Check",
    text: "A Safe Pro walks through every room and points out risks: sharp corners, open sockets, loose furniture, stairs and more.",
  },
  {
    title: "Baby-Proofing Installation",
    text: "Safety gates, bed rails, corner guards, cabinet locks and window guards, fitted properly by a trained professional.",
  },
  {
    title: "Servicing & Repair",
    text: "Already have Kiddough products? We check, adjust and repair them so they keep your child safe.",
  },
];

const STEPS = [
  ["Book a slot", "Choose a service, your address and a time that suits you."],
  ["A verified Safe Pro visits", "ID-checked and trained. You'll see who is coming before they arrive."],
  ["Confirm with your code", "When the work is done, share your 4-digit code to close the job."],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-10 sm:py-16">
          <p className="mb-3 inline-block rounded-full bg-accent-500/10 px-3 py-1 text-xs font-extrabold tracking-wide text-accent-500 uppercase">
            Home child-safety service
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold text-slate-900 sm:text-5xl">A safer home for your little one</h1>
          <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
            Trained Kiddough Safe Pros check your home, install baby-proofing products and service them, at a time that suits you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/book" className="btn btn-primary px-6 py-3 text-base">
              Book a home visit
            </Link>
            <Link href="/track" className="btn btn-secondary px-6 py-3 text-base">
              Track a booking
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="card">
              <h2 className="text-lg font-extrabold text-slate-900">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-slate-900">How it works</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-700 font-extrabold text-white">{i + 1}</span>
                <span>
                  <span className="block font-extrabold text-slate-900">{title}</span>
                  <span className="text-sm text-slate-600">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-800 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold">Are you a skilled installer?</h2>
            <p className="mt-1 text-sm text-brand-100">Join Kiddough as a Safe Pro. Get jobs near you and track your earnings.</p>
          </div>
          <Link href="/pro/register" className="btn bg-white px-5 text-brand-800 hover:bg-brand-50">
            Join as a Safe Pro
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">This page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Go home
      </Link>
    </main>
  );
}

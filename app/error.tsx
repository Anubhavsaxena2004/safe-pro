"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">Please try again. If this keeps happening, contact the Kiddough team.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Error ID: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}

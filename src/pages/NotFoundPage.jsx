import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
        <Link to="/dashboard" className="mt-3 inline-block text-sm text-sky-600">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}

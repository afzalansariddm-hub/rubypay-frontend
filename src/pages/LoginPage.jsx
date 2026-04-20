import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    login(email || "user@company.com", password);
    navigate("/dashboard");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 px-4 py-8">
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 bottom-8 h-60 w-60 rounded-full bg-indigo-200/50 blur-3xl" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-9 shadow-xl shadow-slate-300/40">
        <h1 className="text-3xl font-semibold text-slate-900">Payroll Engine</h1>
        <p className="mt-1 text-sm text-slate-500">Secure payroll operations workspace</p>
        <label className="mt-7 block text-sm font-medium text-slate-700">Email</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
        />
        <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setEmail("demo@payrollhq.com");
              setPassword("demo1234");
            }}
          >
            Demo Login
          </button>
        </div>
        <button
          disabled={submitting}
          className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}

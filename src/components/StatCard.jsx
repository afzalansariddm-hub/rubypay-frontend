export default function StatCard({ label, value, tone = "slate", icon = "•" }) {
  const toneClass = {
    slate: "text-slate-700",
    green: "text-emerald-600",
    yellow: "text-amber-600",
    red: "text-rose-600",
    blue: "text-sky-600",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/60">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{icon}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

import clsx from "clsx";

export default function StageSidebar({ stages, selectedStageId, onSelect }) {
  const getStageProgress = (stage) => {
    if (stage.status === "Completed") return 100;
    if (stage.status === "In Progress") {
      const summaryProgress = stage.summary
        ? Math.round(
            ((stage.summary.passed + stage.summary.clarified) /
              Math.max(1, stage.summary.passed + stage.summary.flagged)) *
              100,
          )
        : 0;
      return Math.max(25, summaryProgress || 100 - stage.errorCount * 10);
    }
    return 0;
  };

  return (
    <aside className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm shadow-slate-200/60">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Payroll Stages</h3>
      <div className="space-y-2">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => onSelect(stage.id)}
            disabled={stage.locked}
            className={clsx(
              "w-full rounded-lg border p-3 text-left shadow-sm transition",
              selectedStageId === stage.id
                ? "border-sky-500 bg-sky-100 shadow-sky-200"
                : "border-slate-200 bg-white",
              stage.locked && "cursor-not-allowed opacity-45",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">{stage.name}</p>
              {stage.locked && <span title="Locked" className="text-base text-slate-600">🔒</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{stage.status}</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-sky-500 transition-all" style={{ width: `${getStageProgress(stage)}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{getStageProgress(stage)}%</p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700">{stage.errorCount} errors</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">{stage.warningCount} warnings</span>
            </div>
            {stage.summary && (
              <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                  {stage.summary.passed || 0} passed
                </span>
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-700">
                  {stage.summary.flagged || 0} flagged
                </span>
                <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-700">
                  {stage.summary.clarified || 0} clarified
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

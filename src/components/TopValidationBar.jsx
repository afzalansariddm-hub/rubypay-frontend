export default function TopValidationBar({
  stageName,
  recordsCount,
  errorsCount,
  warningsCount,
  stageSummary,
  onValidate,
  onOverride,
  disabled,
  onUndo,
  onRedo,
  validateLabel = "Validate & Continue",
  blockedHelperText = "Resolve all blocking issues to continue",
}) {
  const blocked = errorsCount > 0;
  const passedCount = stageSummary?.passed ?? Math.max(0, recordsCount - errorsCount - warningsCount);
  const flaggedCount = stageSummary?.flagged ?? errorsCount + warningsCount;
  const clarifiedCount = stageSummary?.clarified ?? 0;

  return (
    <div className="sticky top-0 z-20 mb-3 rounded-xl border border-sky-100 bg-sky-50/80 p-3 shadow-sm shadow-slate-200/60 backdrop-blur">
      {stageName && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">{stageName}</p>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Real-data validation
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-700">{recordsCount} Records</span>
        <span className="text-slate-300">|</span>
        <span className="rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
          {errorsCount} Blocking Errors
        </span>
        <span className="text-slate-300">|</span>
        <span className="font-medium text-amber-700">{warningsCount} Warnings</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
          {passedCount} passed
        </span>
        <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
          {flaggedCount} flagged
        </span>
        <span className="rounded bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
          {clarifiedCount} clarified
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-start gap-2">
        <button className="rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={onUndo}>
          Undo
        </button>
        <button className="rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={onRedo}>
          Redo
        </button>
        {blocked && onOverride && (
          <button
            className="rounded border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
            onClick={onOverride}
          >
            Override
          </button>
        )}
        <div className="ml-auto text-right">
          <button
            className="rounded bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-200 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onValidate}
            disabled={disabled || blocked}
          >
            {disabled ? "Processing..." : validateLabel}
          </button>
          {blocked && (
            <p className="mt-1 text-xs text-rose-600">{blockedHelperText}</p>
          )}
          {!blocked && recordsCount === 0 && (
            <p className="mt-1 text-xs text-slate-500">No records available in this stage yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

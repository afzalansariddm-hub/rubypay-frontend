import clsx from "clsx";

export default function ProcessingStepper({ steps }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      {steps.map((step, index) => (
        <div key={step.label} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {index + 1}. {step.label}
            </p>
            <span
              className={clsx(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                step.status === "Done" && "bg-emerald-100 text-emerald-700",
                step.status === "Running" && "bg-sky-100 text-sky-700",
                step.status === "Pending" && "bg-slate-100 text-slate-500",
              )}
            >
              {step.status === "Done" && "✓"}
              {step.status === "Running" && (
                <span className="inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
              )}
              {step.status}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={clsx(
                "h-2 rounded-full transition-all",
                step.status === "Done" && "bg-emerald-300",
                step.status === "Running" &&
                  "bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 [background-size:200%_100%] animate-pulse",
                step.status === "Pending" && "bg-transparent",
              )}
              style={{ width: `${step.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

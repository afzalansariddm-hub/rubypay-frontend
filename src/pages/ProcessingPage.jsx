import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProcessingStepper from "../components/ProcessingStepper";
import { usePayrollStore } from "../store/payrollStore";

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentRun, fetchRun, startRun } = usePayrollStore();
  const [steps, setSteps] = useState([
    { key: "intake", label: "Validating uploads", status: "Pending", progress: 0 },
    { key: "dataValidation", label: "Preparing data validation", status: "Pending", progress: 0 },
    { key: "mileageVerification", label: "Preparing mileage verification", status: "Pending", progress: 0 },
    { key: "timesheetReview", label: "Preparing timesheet review", status: "Pending", progress: 0 },
  ]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const overallProgress = useMemo(
    () => Math.round(steps.reduce((sum, step) => sum + step.progress, 0) / steps.length),
    [steps],
  );

  useEffect(() => {
    fetchRun(id);
  }, [fetchRun, id]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const updated = await startRun(id);
        if (cancelled) {
          return;
        }
        if (updated?.orchestration?.steps?.length) {
          setSteps(
            updated.orchestration.steps.map((step) => ({
              key: step.key,
              label: step.label,
              status: step.status,
              progress: step.progress,
            })),
          );
        }
        if (updated?.orchestration?.logs?.length) {
          setLogs(
            updated.orchestration.logs.map((log) => ({
              id: log.id,
              type: log.level === "warning" ? "warning" : log.level === "error" ? "error" : "success",
              message: log.message,
              createdAt: log.createdAt,
            })),
          );
        }

        if (updated?.orchestration?.status === "READY_FOR_REVIEW") {
          navigate(`/runs/${id}`);
        }
      } catch (runError) {
        if (!cancelled) {
          setError(runError.message || "Unable to process uploaded data");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, startRun]);

  const title = useMemo(() => currentRun?.runName || "Payroll Run", [currentRun]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">
          {currentRun?.payPeriodStart} to {currentRun?.payPeriodEnd} • Status: {currentRun?.status || "Processing"}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>Overall Progress: {overallProgress}%</span>
            <span>{steps.filter((step) => step.status === "Done").length} / {steps.length} completed</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-sky-600 transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {currentRun ? (
            <ProcessingStepper steps={steps} />
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-5 w-60 animate-pulse rounded bg-slate-200" />
              <div className="h-14 animate-pulse rounded bg-slate-100" />
              <div className="h-14 animate-pulse rounded bg-slate-100" />
              <div className="h-14 animate-pulse rounded bg-slate-100" />
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <h2 className="text-sm font-semibold text-slate-700">Log Stream</h2>
          <div className="mt-3 space-y-2">
            {logs.map((log) => (
              <p
                key={log.id}
                className={`rounded px-3 py-2 text-xs ${
                  log.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : log.type === "warning"
                      ? "bg-amber-50 text-amber-700"
                      : log.type === "error"
                        ? "bg-rose-50 text-rose-700"
                      : "bg-sky-50 text-sky-700"
                }`}
              >
                [{new Date(log.createdAt).toLocaleTimeString()}] {log.message}
              </p>
            ))}
            {logs.length === 0 && (
              <>
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
              </>
            )}
          </div>
        </div>
      </section>
      <p className="mt-4 text-sm text-slate-500">Processing uploaded data against reference policies...</p>
      </div>
    </main>
  );
}

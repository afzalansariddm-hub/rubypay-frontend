import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RunsTable from "../components/RunsTable";
import StartPayrollRunModal from "../components/StartPayrollRunModal";
import StatCard from "../components/StatCard";
import { usePayrollStore } from "../store/payrollStore";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [toasts, setToasts] = useState([]);
  const { runs, loading, fetchRuns, createRun } = usePayrollStore();

  const pushToast = (message) => {
    const toast = { id: `toast-${Date.now()}`, message };
    setToasts((items) => [toast, ...items].slice(0, 3));
    setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== toast.id));
    }, 2600);
  };

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    const handler = (event) => {
      pushToast(event?.detail?.message || "Browser storage is full. Clear local data and try again.");
    };
    window.addEventListener("payroll:storage-quota-exceeded", handler);
    return () => window.removeEventListener("payroll:storage-quota-exceeded", handler);
  }, []);

  const stats = useMemo(
    () => ({
      total: runs.length,
      draft: runs.filter((run) => run.status === "Draft").length,
      processing: runs.filter((run) => run.status === "Processing").length,
      completed: runs.filter((run) => run.status === "Completed").length,
      failed: runs.filter((run) => run.status === "Failed").length,
    }),
    [runs],
  );

  const handleCreateRun = async (payload) => {
    setIsCreatingRun(true);
    try {
      const run = await createRun(payload);
      setOpenModal(false);
      navigate(`/runs/${run.id}/processing`);
    } catch (error) {
      const isQuotaError =
        error?.name === "QuotaExceededError" ||
        String(error?.message || "").toLowerCase().includes("quota");
      pushToast(
        isQuotaError
          ? "Browser storage is full. Clear local data and try again."
          : error?.message || "Unable to create payroll run",
      );
    } finally {
      setIsCreatingRun(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Payroll Dashboard</h1>
          <p className="text-sm text-slate-500">Upload → Validate → Review → Calculate → Export</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700"
        >
          Start Payroll Run
        </button>
        <button
          onClick={() => navigate("/knowledge-base")}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Knowledge Base
        </button>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Runs" value={stats.total} icon="Σ" />
        <StatCard label="Draft" value={stats.draft} icon="◌" />
        <StatCard label="Processing" value={stats.processing} tone="blue" icon="↻" />
        <StatCard label="Completed" value={stats.completed} tone="green" icon="✓" />
        <StatCard label="Failed" value={stats.failed} tone="red" icon="!" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Payroll Runs</h2>
          <p className="text-xs text-slate-500">Real-data run history</p>
        </div>
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
            <div className="h-16 animate-pulse rounded bg-slate-100" />
            <div className="h-16 animate-pulse rounded bg-slate-100" />
            <div className="h-16 animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <RunsTable runs={runs} />
        )}
      </section>

      <StartPayrollRunModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleCreateRun}
        busy={isCreatingRun}
      />
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            {toast.message}
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}

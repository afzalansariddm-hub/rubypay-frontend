import clsx from "clsx";
import { Link } from "react-router-dom";

const statusTone = {
  Draft: "bg-slate-100 text-slate-700",
  Processing: "bg-sky-100 text-sky-700",
  "In Progress": "bg-sky-100 text-sky-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
};

export default function RunsTable({ runs }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Run Name</th>
            <th className="px-4 py-3">Pay Period</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Last Updated</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
            >
              <td className="px-4 py-3 font-medium text-slate-800">{run.runName}</td>
              <td className="px-4 py-3 text-slate-600">{run.payPeriod}</td>
              <td className="px-4 py-3">
                <span className={clsx("rounded-full px-2 py-1 text-xs font-medium", statusTone[run.status])}>
                  {run.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={clsx(
                      "h-2 rounded-full",
                      run.status === "Completed" && "bg-emerald-500",
                      run.status === "Failed" && "bg-rose-500",
                      run.status === "Draft" && "bg-slate-400",
                      (run.status === "Processing" || run.status === "In Progress") && "bg-sky-500",
                    )}
                    style={{ width: `${run.progress}%` }}
                  />
                </div>
                <span className="mt-1 inline-block text-xs font-medium text-slate-500">{run.progress}% complete</span>
              </td>
              <td className="px-4 py-3 text-slate-500">{new Date(run.lastUpdated).toLocaleString()}</td>
              <td className="px-4 py-3">
                <Link
                  to={run.status === "Processing" ? `/runs/${run.id}/processing` : `/runs/${run.id}`}
                  className="font-medium text-sky-600 hover:text-sky-700"
                >
                  {run.status === "Draft" ? "Resume" : run.status === "Processing" ? "Continue" : "Open"}
                </Link>
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                No payroll runs yet. Start a new run to upload files and begin validation.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

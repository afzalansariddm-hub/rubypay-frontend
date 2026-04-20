import { formatDateTime } from "../utils/date";
import { useState } from "react";

export default function AuditTimeline({ entries }) {
  const [expandedEntryIds, setExpandedEntryIds] = useState([]);

  const getMeta = (entry) => {
    if (entry.actor?.toLowerCase().includes("ai")) {
      return { icon: "🤖", tag: "AI" };
    }
    if (entry.actor?.toLowerCase().includes("system")) {
      return { icon: "⚙", tag: "System" };
    }
    if (entry.type?.includes("OVERRIDE")) {
      return { icon: "🛡", tag: "User Override" };
    }
    return { icon: "👤", tag: "User" };
  };

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">Audit Timeline</h3>
      <div className="mt-3 max-h-64 space-y-2 overflow-auto">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-slate-100 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{getMeta(entry).tag}</span>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {getMeta(entry).icon} {entry.actor} • {entry.type}
            </p>
            <button
              className="mt-1 text-xs font-medium text-sky-600"
              onClick={() =>
                setExpandedEntryIds((ids) =>
                  ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id],
                )
              }
            >
              {expandedEntryIds.includes(entry.id) ? "Collapse" : "Expand"}
            </button>
            {expandedEntryIds.includes(entry.id) && (
              <>
                <p className="mt-2 text-sm text-slate-600">{entry.details}</p>
                {entry.before !== undefined && (
                  <p className="mt-1 text-xs text-slate-500">
                    {String(entry.before)} → {String(entry.after)}
                  </p>
                )}
              </>
            )}
          </article>
        ))}
        {entries.length === 0 && <p className="text-sm text-slate-500">No audit entries yet.</p>}
      </div>
    </section>
  );
}

export default function FiltersBar({
  filters,
  employees,
  properties,
  issueTypeOptions = [],
  onChange,
  onToggleIssueType,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm md:grid-cols-4">
      <input
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder="Search employee"
        value={filters.searchQuery}
        onChange={(event) => onChange("searchQuery", event.target.value)}
      />
      <select
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        value={filters.employee}
        onChange={(event) => onChange("employee", event.target.value)}
      >
        <option value="">All Employees</option>
        {employees.map((employee) => (
          <option key={employee} value={employee}>
            {employee}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        value={filters.property}
        onChange={(event) => onChange("property", event.target.value)}
      >
        <option value="">All Properties</option>
        {properties.map((property) => (
          <option key={property} value={property}>
            {property}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={filters.onlyErrors}
          onChange={(event) => onChange("onlyErrors", event.target.checked)}
        />
        Only Errors
      </label>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Filters are stage-specific
      </div>
      <div className="md:col-span-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Issue Type Filters</p>
          {filters.issueTypes?.length > 0 && (
            <button
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
              onClick={() => onChange("issueTypes", [])}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {issueTypeOptions.length === 0 && (
            <span className="text-xs text-slate-500">No issues in this stage.</span>
          )}
          {issueTypeOptions.map((issueType) => {
            const active = (filters.issueTypes || []).includes(issueType.code);
            return (
              <button
                key={issueType.code}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-sky-300 bg-sky-100 text-sky-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => onToggleIssueType?.(issueType.code)}
              >
                {issueType.label} ({issueType.count})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FiltersBar({ filters, employees, properties, onChange }) {
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
    </div>
  );
}

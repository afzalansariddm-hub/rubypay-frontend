import clsx from "clsx";

const hasOpenIssue = (row, code) => (row.issues || []).some((issue) => issue.code === code && issue.status === "open");
const getIssueGroupCode = (row) => (row.issues || []).find((issue) => issue.status === "open")?.code || "";

const STAGE_COLUMNS = {
  "Data Validation": [
    "employee",
    "property",
    "mappedEmployee",
    "firstPaycheck",
  ],
  "Mileage Verification": [
    "employee",
    "property",
    "reportedMiles",
    "verifiedMiles",
    "variance",
    "mileageRate",
    "mileageAmount",
    "clarificationStatus",
  ],
  "Timesheet Review": [
    "employee",
    "property",
    "hours",
    "baseRate",
    "grossPay",
  ],
  "Payroll Calculation": [
    "employee",
    "lineType",
    "hours",
    "regularHours",
    "overtimeHours",
    "holidayHours",
    "mileageAmount",
    "recurringAdjustments",
    "grossPay",
  ],
  "QBO Bills": [
    "employee",
    "vendorName",
    "billDate",
    "dueDate",
    "billNumber",
    "billTotal",
  ],
  "Journal Entry": [
    "jeNumber",
    "property",
    "lineNum",
    "account",
    "debit",
    "credit",
    "qboClass",
  ],
};

export default function WorkspaceTable({
  stageName,
  rows,
  selectedRowId,
  highlightedRowIds = [],
  employeeOptions = [],
  propertyOptions = [],
  onSelectRow,
  onCellChange,
  onApplyRowFix,
  onIgnoreRow,
  onFixSimilar,
  onMapEmployee,
  onMapProperty,
  onRequestPropertyApproval,
  onIssueAction,
  sortState,
  onSortVariance,
  onIgnoreSimilar,
}) {
  const columns = STAGE_COLUMNS[stageName] || ["employee", "property", "regularHours", "overtimeHours", "mileage", "grossPay"];

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        No rows match the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className={clsx(
                  "whitespace-nowrap px-4 py-2.5",
                  column === "property" && "min-w-[260px]",
                )}
              >
                {column === "variance" ? (
                  <button
                    className="inline-flex items-center gap-1 rounded border border-transparent px-1 py-0.5 hover:border-slate-200 hover:bg-white"
                    onClick={onSortVariance}
                  >
                    variance
                    <span className="text-[10px] text-slate-400">
                      {sortState?.direction === "asc"
                        ? "↑"
                        : sortState?.direction === "desc"
                          ? "↓"
                          : "↕"}
                    </span>
                  </button>
                ) : (
                  column
                )}
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-2.5">Issue</th>
            <th className="whitespace-nowrap px-4 py-2.5">AI Suggestion</th>
            <th className="whitespace-nowrap px-4 py-2.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const issueGroupCode = getIssueGroupCode(row);
            const similarPattern = issueGroupCode || row.error || row.warning || "";
            return (
            <tr
              key={row.id}
              onClick={() => onSelectRow(row.id)}
              className={clsx(
                "cursor-pointer border-t border-slate-100 transition-colors hover:bg-sky-50/60",
                row.error && "bg-rose-50",
                !row.error && row.warning && "bg-amber-50",
                highlightedRowIds.includes(row.id) && "ring-2 ring-inset ring-sky-300",
                row.aiSuggestion && "ring-1 ring-inset ring-sky-100",
                selectedRowId === row.id && "outline outline-2 outline-sky-300",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column}
                  className={clsx(
                    "px-3 py-2",
                    column === "property" && "min-w-[260px]",
                  )}
                >
                  {stageName === "Data Validation" && column === "mappedEmployee" && hasOpenIssue(row, "EMPLOYEE_NOT_FOUND") ? (
                    <div className="space-y-1">
                      <select
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        value={row.mappedEmployee || ""}
                        onChange={(event) => onCellChange(row.id, "mappedEmployee", event.target.value)}
                      >
                        <option value="">Map employee...</option>
                        {employeeOptions.map((employee) => (
                          <option key={employee} value={employee}>
                            {employee}
                          </option>
                        ))}
                      </select>
                      <button
                        className="w-full rounded border border-sky-200 px-2 py-1 text-[11px] text-sky-700 hover:bg-sky-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!row.mappedEmployee) return;
                          onMapEmployee?.({ sourceName: row.sourceEmployeeName || row.employee, targetEmployee: row.mappedEmployee });
                        }}
                      >
                        Apply mapping
                      </button>
                    </div>
                  ) : stageName === "Data Validation" && column === "mappedProperty" && hasOpenIssue(row, "PROPERTY_NOT_FOUND") ? (
                    <div className="space-y-1">
                      <select
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        value={row.mappedProperty || ""}
                        onChange={(event) => onCellChange(row.id, "mappedProperty", event.target.value)}
                      >
                        <option value="">Map property...</option>
                        {propertyOptions.map((property) => (
                          <option key={property} value={property}>
                            {property}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button
                          className="flex-1 rounded border border-sky-200 px-2 py-1 text-[11px] text-sky-700 hover:bg-sky-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!row.mappedProperty) return;
                            onMapProperty?.({
                              sourceProperty: row.sourcePropertyName || row.property,
                              targetProperty: row.mappedProperty,
                            });
                          }}
                        >
                          Apply
                        </button>
                        <button
                          className="flex-1 rounded border border-amber-200 px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRequestPropertyApproval?.({
                              sourceProperty: row.sourcePropertyName || row.property,
                              proposedProperty: row.mappedProperty || row.sourcePropertyName || row.property,
                            });
                          }}
                        >
                          Create (Pending)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <input
                      value={row[column] ?? ""}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 focus:border-sky-300 focus:bg-white"
                      onChange={(event) => onCellChange(row.id, column, event.target.value)}
                    />
                  )}
                </td>
              ))}
              <td className="px-4 py-2.5 text-xs text-slate-700">
                {row.error && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-1 text-rose-700">
                    ⚠ {row.error}
                  </span>
                )}
                {!row.error && row.warning && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-amber-700">
                    ⚑ {row.warning}
                  </span>
                )}
                {!row.error && !row.warning && "-"}
              </td>
              <td className="px-4 py-2.5 text-xs text-sky-700">
                <div className="space-y-2">
                  <p>{row.aiSuggestion || "-"}</p>
                  {row.aiSuggestion && (
                    <button
                      className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        onApplyRowFix(row.id);
                      }}
                    >
                      Apply Fix
                    </button>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-xs">
                <div className="flex flex-wrap gap-1">
                  {hasOpenIssue(row, "PROPERTY_NOT_FOUND") && (
                    <div className="mr-1 min-w-[220px] space-y-1 rounded border border-amber-200 bg-amber-50 p-1.5">
                      <select
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-[11px]"
                        value={row.mappedProperty || ""}
                        onChange={(event) => onCellChange(row.id, "mappedProperty", event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <option value="">Map property...</option>
                        {propertyOptions.map((property) => (
                          <option key={property} value={property}>
                            {property}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button
                          className="flex-1 rounded border border-sky-200 bg-white px-2 py-1 text-[11px] text-sky-700 hover:bg-sky-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!row.mappedProperty) return;
                            onMapProperty?.({
                              sourceProperty: row.sourcePropertyName || row.property,
                              targetProperty: row.mappedProperty,
                            });
                          }}
                        >
                          Apply
                        </button>
                        <button
                          className="flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRequestPropertyApproval?.({
                              sourceProperty: row.sourcePropertyName || row.property,
                              proposedProperty: row.mappedProperty || row.sourcePropertyName || row.property,
                            });
                          }}
                        >
                          Create New
                        </button>
                      </div>
                    </div>
                  )}
                  {stageName === "Data Validation" &&
                    (row.issues || [])
                      .filter((issue) => issue.code === "RATE_DELTA" && issue.status === "open")
                      .map((issue) => (
                        <div key={`${row.id}-${issue.code}`} className="flex gap-1">
                          <button
                            className="rounded border border-emerald-200 px-2 py-1 text-emerald-700 hover:bg-emerald-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              onIssueAction?.({ rowId: row.id, issueCode: issue.code, action: "resolve" });
                            }}
                          >
                            Resolve
                          </button>
                          <button
                            className="rounded border border-amber-200 px-2 py-1 text-amber-700 hover:bg-amber-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              onIssueAction?.({ rowId: row.id, issueCode: issue.code, action: "ignore" });
                            }}
                          >
                            Ignore
                          </button>
                          <button
                            className="rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              onIssueAction?.({ rowId: row.id, issueCode: issue.code, action: "override" });
                            }}
                          >
                            Override
                          </button>
                        </div>
                      ))}
                  <button
                    className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectRow(row.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded border border-amber-200 px-2 py-1 text-amber-700 hover:bg-amber-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      onIgnoreRow(row.id);
                    }}
                  >
                    Ignore
                  </button>
                  <button
                    className="rounded border border-sky-200 px-2 py-1 text-sky-700 hover:bg-sky-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      onApplyRowFix(row.id);
                    }}
                  >
                    Apply Fix
                  </button>
                  {(row.error || row.warning) && (
                    <button
                      className="rounded border border-violet-200 px-2 py-1 text-violet-700 hover:bg-violet-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        onFixSimilar(similarPattern);
                      }}
                    >
                      Fix all similar
                    </button>
                  )}
                  {similarPattern && (
                    <button
                      className="rounded border border-transparent px-2 py-1 text-indigo-700 underline-offset-2 hover:bg-indigo-50 hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        onIgnoreSimilar?.(similarPattern);
                      }}
                    >
                      Ignore all
                    </button>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AICopilotPanel from "../components/AICopilotPanel";
import AuditTimeline from "../components/AuditTimeline";
import FiltersBar from "../components/FiltersBar";
import StageSidebar from "../components/StageSidebar";
import TopValidationBar from "../components/TopValidationBar";
import WorkspaceTable from "../components/WorkspaceTable";
import { usePayrollStore } from "../store/payrollStore";

export default function PayrollRunPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [persistGlobal, setPersistGlobal] = useState(false);
  const [varianceSortDirection, setVarianceSortDirection] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const {
    currentRun,
    selectedStageId,
    selectedRowId,
    filters,
    aiMessages,
    aiLoading,
    highlightedRowIds,
    affectedRowsCount,
    isDirty,
    fetchRun,
    fetchRuns,
    setFilter,
    toggleIssueType,
    selectRow,
    selectStage,
    goToPreviousStage,
    updateCell,
    validateStage,
    askCopilot,
    applyAiFix,
    ignoreRowIssue,
    ignoreAllSimilarIssues,
    fixAllSimilarIssues,
    resolveIssueAction,
    applyEmployeeMapping,
    applyPropertyMapping,
    requestPropertyApproval,
    resolvePropertyApproval,
    undo,
    redo,
    saveAndExitRun,
    discardCurrentRun,
    exportPayroll,
  } = usePayrollStore();

  useEffect(() => {
    fetchRun(id);
  }, [fetchRun, id]);

  const pushToast = (message) => {
    const toast = { id: `toast-${Date.now()}`, message };
    setToasts((items) => [toast, ...items].slice(0, 3));
    setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== toast.id));
    }, 2200);
  };

  const stage = useMemo(
    () => currentRun?.stages.find((item) => item.id === selectedStageId) || currentRun?.stages[0],
    [currentRun, selectedStageId],
  );

  const filteredRows = useMemo(() => {
    if (!stage) return [];
    return stage.rows.filter((row) => {
      const employeeMatch = !filters.employee || row.employee === filters.employee;
      const propertyMatch = !filters.property || row.property === filters.property;
      const queryMatch =
        !filters.searchQuery ||
        row.employee.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const issueMatch = !filters.onlyErrors || Boolean(row.error);
      const selectedIssueTypes = filters.issueTypes || [];
      const issueTypeMatch =
        selectedIssueTypes.length === 0 ||
        (row.issues || []).some(
          (issue) => issue.status === "open" && selectedIssueTypes.includes(issue.code),
        );
      return employeeMatch && propertyMatch && queryMatch && issueMatch && issueTypeMatch;
    });
  }, [stage, filters]);

  const issueTypeOptions = useMemo(() => {
    if (!stage) {
      return [];
    }
    const grouped = new Map();
    stage.rows.forEach((row) => {
      (row.issues || [])
        .filter((issue) => issue.status === "open")
        .forEach((issue) => {
          const entry = grouped.get(issue.code) || {
            code: issue.code,
            label: issue.code,
            count: 0,
          };
          entry.count += 1;
          grouped.set(issue.code, entry);
        });
    });
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [stage]);

  const sortedRows = useMemo(() => {
    if (stage?.name !== "Mileage Verification" || !varianceSortDirection) {
      return filteredRows;
    }
    const multiplier = varianceSortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort(
      (a, b) => (parseFloat(a.variance || 0) - parseFloat(b.variance || 0)) * multiplier,
    );
  }, [filteredRows, stage?.name, varianceSortDirection]);

  const isPayrollCalculationStage = stage?.name === "Payroll Calculation";
  const isQBOBillsStage = stage?.name === "QBO Bills";
  const isJournalEntryStage = stage?.name === "Journal Entry";
  const isAccountingStage = stage?.name === "Accounting & Export";
  const isDataValidationStage = stage?.name === "Data Validation";
  const stageSummary = stage?.summary || { passed: 0, flagged: 0, clarified: 0 };
  const recordsCount = stage?.rows.length || 0;
  const errorsCount = stage?.errorCount || 0;
  const warningsCount = stage?.warningCount || 0;
  const stageHasRun = true;
  const stageGuidance = useMemo(() => {
    if (!stage) {
      return "";
    }
    if (stage.name === "Data Validation") {
      return "Employee identity, property mapping, rate deltas, holiday checks, and first-paycheck rules.";
    }
    if (stage.name === "Mileage Verification") {
      return "Reported vs verified miles, GPS reliability flags, zero-mileage employees, and same-building group checks.";
    }
    if (stage.name === "Timesheet Review") {
      return "Regular/OT/weekend/holiday pay checks with compliance and reconciliation validations.";
    }
    if (stage.name === "Payroll Calculation") {
      return "Final payroll rows grouped by payout method (Melio, 1099 DD, W2) with recurring adjustments and Lorena rate splits.";
    }
    if (stage.name === "QBO Bills") {
      return "QBO bill instructions for 1099 contractors. W2 employees and skip_qbo employees excluded. Verify vendor names, bill dates, and category routing.";
    }
    if (stage.name === "Journal Entry") {
      return "Journal entries for W2 employees only (Jonathon, Marlin, Daniel, Michael). 3-line rule per property: debit + wages credit + taxes credit. Verify balance.";
    }
    return "Prepare accounting export handoff once validations and payroll generation are complete.";
  }, [stage]);

  const buildStageSyncedPayload = () => {
    if (!currentRun || !stage) {
      return null;
    }
    return currentRun;
  };

  const handleValidate = async () => {
    if (!stage) return;
    setIsValidating(true);
    try {
      await validateStage({ stageId: stage.id, payload: buildStageSyncedPayload() });
      pushToast("Stage validated");
    } catch (error) {
      pushToast(error.message || "Unable to validate stage");
    } finally {
      setIsValidating(false);
    }
  };

  const handleOverride = async () => {
    setIsValidating(true);
    try {
      await validateStage({
        stageId: stage.id,
        overrideReason: reason,
        payload: buildStageSyncedPayload(),
      });
      setOverrideOpen(false);
      setReason("");
      pushToast("Stage override applied");
    } catch (error) {
      pushToast(error.message || "Unable to apply stage override");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveExit = async () => {
    await saveAndExitRun();
    await fetchRuns();
    pushToast("Payroll run saved successfully");
    navigate("/dashboard");
  };

  const handleDiscardRun = async () => {
    await discardCurrentRun();
    pushToast("Payroll run discarded");
    navigate("/dashboard");
  };

  const handleBackStage = () => {
    if (isDirty) {
      setBackConfirmOpen(true);
      return;
    }
    goToPreviousStage();
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const file = await exportPayroll();
      if (!file) {
        return;
      }
      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      pushToast("Payroll XLSX generated");
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentRun || !stage) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
        <div className="w-full space-y-4">
          <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="h-[560px] animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
              <div className="h-[320px] animate-pulse rounded-xl border border-slate-200 bg-white" />
              <div className="h-[210px] animate-pulse rounded-xl border border-slate-200 bg-white" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const employees = [...new Set(stage.rows.map((row) => row.employee))];
  const properties = [...new Set(stage.rows.map((row) => row.property))];
  const referenceEmployees = currentRun.referenceOptions?.employees || employees;
  const referenceProperties = currentRun.referenceOptions?.properties || properties;
  const payrollBreakdownRows = stage.rows || [];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="w-full">
        <header className="mb-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <button
                className="rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">{currentRun.runName}</h1>
                <p className="text-sm text-slate-500">
                  {currentRun.payPeriodStart} to {currentRun.payPeriodEnd} • {currentRun.status}
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                className="rounded border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                onClick={() => setShowActions((value) => !value)}
              >
                Actions ▾
              </button>
              {showActions && (
                <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow">
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={handleSaveExit}
                  >
                    Save & Exit
                  </button>
                  <button
                    className="block w-full rounded px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setShowActions(false);
                      setDiscardOpen(true);
                    }}
                  >
                    Discard Run
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="self-start lg:sticky lg:top-6">
            <StageSidebar stages={currentRun.stages} selectedStageId={stage.id} onSelect={selectStage} />
          </aside>

          <section className="min-w-0 space-y-3">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  className="rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={handleBackStage}
                >
                  Back
                </button>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                    {stageSummary.passed || 0} passed
                  </span>
                  <span className="rounded bg-indigo-100 px-2 py-1 font-medium text-indigo-700">
                    {stageSummary.flagged || 0} flagged
                  </span>
                  <span className="rounded bg-sky-100 px-2 py-1 font-medium text-sky-700">
                    {stageSummary.clarified || 0} clarified
                  </span>
                </div>
              </div>
            </div>
            <TopValidationBar
              stageName={stage.name}
              recordsCount={recordsCount}
              errorsCount={errorsCount}
              warningsCount={warningsCount}
              stageSummary={stageSummary}
              onValidate={handleValidate}
              onOverride={() => setOverrideOpen(true)}
              onUndo={undo}
              onRedo={redo}
              disabled={isValidating || !stageHasRun}
              validateLabel={isAccountingStage ? "Complete Run" : "Validate & Continue"}
              blockedHelperText="Resolve all blocking issues to continue"
            />
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Stage Guidance</h3>
              <p className="mt-1 text-sm text-slate-600">{stageGuidance}</p>
            </section>

            {isAccountingStage ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Accounting & Export</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Coming soon: QuickBooks sync will be enabled in this stage.
                </p>
              </section>
            ) : (
              <>
                {(isDataValidationStage || (currentRun.pendingPropertyApprovals || []).length > 0) && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-800">Mapping & Approval Controls</h3>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={persistGlobal}
                          onChange={(event) => setPersistGlobal(event.target.checked)}
                        />
                        Persist approved mappings globally
                      </label>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Run-level mappings are applied immediately and propagate to downstream stages.
                    </p>
                    {(currentRun.pendingPropertyApprovals || []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(currentRun.pendingPropertyApprovals || []).map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-xs"
                          >
                            <span>
                              <strong>{request.sourceProperty}</strong>
                              {" -> "}
                              {request.proposedProperty} ({request.status})
                            </span>
                            {request.status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  className="rounded border border-emerald-200 px-2 py-1 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() =>
                                    resolvePropertyApproval({
                                      requestId: request.id,
                                      action: "approve",
                                      approvedPropertyName: request.proposedProperty,
                                      persistGlobal,
                                    })
                                  }
                                >
                                  Approve
                                </button>
                                <button
                                  className="rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50"
                                  onClick={() =>
                                    resolvePropertyApproval({
                                      requestId: request.id,
                                      action: "reject",
                                      approvedPropertyName: "",
                                      persistGlobal: false,
                                    })
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
                {isPayrollCalculationStage && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-800">Employee-wise Breakdown</h3>
                    <div className="mt-3 overflow-auto rounded border border-slate-200">
                      <table className="w-full min-w-[1060px] text-xs">
                        <thead className="bg-slate-50 text-left uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Employee</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Hours</th>
                            <th className="px-3 py-2">Reg Hours</th>
                            <th className="px-3 py-2">OT Hours</th>
                            <th className="px-3 py-2">Holiday</th>
                            <th className="px-3 py-2">Mileage</th>
                            <th className="px-3 py-2">Recurring</th>
                            <th className="px-3 py-2">Gross Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollBreakdownRows.map((row) => (
                            <tr
                              key={row.id}
                              className={clsx(
                                "border-t border-slate-100",
                                row.lineType === "weekend" && "bg-violet-50/40",
                                row.lineType === "holiday" && "bg-amber-50/40",
                                row.lineType === "mileage" && "bg-sky-50/40",
                                parseFloat(row.overtimeHours || 0) > 0 && row.lineType === "standard" && "bg-orange-50/40",
                              )}
                            >
                              <td className="px-3 py-2">{row.employee}</td>
                              <td className="px-3 py-2">
                                <span className={clsx(
                                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  row.lineType === "weekday" && "bg-slate-100 text-slate-600",
                                  row.lineType === "weekend" && "bg-violet-100 text-violet-700",
                                  row.lineType === "holiday" && "bg-amber-100 text-amber-700",
                                  row.lineType === "mileage" && "bg-sky-100 text-sky-700",
                                  row.lineType === "standard" && "bg-slate-100 text-slate-600",
                                  row.lineType === "per_clean" && "bg-emerald-100 text-emerald-700",
                                  row.lineType === "ls_bonus" && "bg-teal-100 text-teal-700",
                                  row.lineType === "hourly_non_str" && "bg-indigo-100 text-indigo-700",
                                  row.lineType === "lawn" && "bg-lime-100 text-lime-700",
                                )}>
                                  {row.lineType || "standard"}
                                </span>
                              </td>
                              <td className="px-3 py-2">{row.hours || "0.00"}</td>
                              <td className="px-3 py-2">{row.regularHours}</td>
                              <td className="px-3 py-2">{row.overtimeHours}</td>
                              <td className="px-3 py-2">{row.holidayHours || "0.00"}</td>
                              <td className="px-3 py-2">{row.mileageAmount || "0.00"}</td>
                              <td className="px-3 py-2">{row.recurringAdjustments || "0.00"}</td>
                              <td className="px-3 py-2 font-semibold">{row.grossPay}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                    <h3 className="text-base font-semibold text-slate-800">Payroll Generation</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Generate final payroll report after resolving flagged entries.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                        onClick={handleExport}
                        disabled={isExporting || errorsCount > 0}
                      >
                        {isExporting ? "Generating..." : "Generate Payroll (XLSX)"}
                      </button>
                      {errorsCount > 0 && (
                        <p className="text-xs text-rose-600">
                          Resolve blocking errors before generating payroll export.
                        </p>
                      )}
                    </div>
                    </div>
                  </section>
                )}
                {isQBOBillsStage && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-800">QBO Bill Summary</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      1099 contractor bills for QuickBooks Online. W2 employees and Pablo (auto-bill) excluded.
                    </p>
                    <div className="mt-3 overflow-auto rounded border border-slate-200">
                      <table className="w-full min-w-[780px] text-xs">
                        <thead className="bg-slate-50 text-left uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Vendor</th>
                            <th className="px-3 py-2">Bill Date</th>
                            <th className="px-3 py-2">Due Date</th>
                            <th className="px-3 py-2">Bill Number</th>
                            <th className="px-3 py-2">Lines</th>
                            <th className="px-3 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stage?.rows || []).map((row) => (
                            <tr key={row.id} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-medium">{row.vendorName || row.employee}</td>
                              <td className="px-3 py-2">{row.billDate}</td>
                              <td className="px-3 py-2">{row.dueDate}</td>
                              <td className="px-3 py-2 text-[11px]">{row.billNumber}</td>
                              <td className="px-3 py-2">{row.lineCount || row.lines?.length || 0}</td>
                              <td className="px-3 py-2 font-semibold">${row.billTotal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {isJournalEntryStage && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-800">Journal Entry Lines</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      W2 employees only. 3-line rule per property: debit + credit 80500.01 Wages + credit 80500.02 Taxes.
                    </p>
                    <div className="mt-3 overflow-auto rounded border border-slate-200">
                      <table className="w-full min-w-[880px] text-xs">
                        <thead className="bg-slate-50 text-left uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">JE #</th>
                            <th className="px-3 py-2">Property</th>
                            <th className="px-3 py-2">Line</th>
                            <th className="px-3 py-2">Account</th>
                            <th className="px-3 py-2">Debit</th>
                            <th className="px-3 py-2">Credit</th>
                            <th className="px-3 py-2">Class</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stage?.rows || []).map((row) => (
                            <tr
                              key={row.id}
                              className={clsx(
                                "border-t border-slate-100",
                                row.lineType === "debit" && "bg-rose-50/40",
                                row.lineType === "credit_wages" && "bg-emerald-50/40",
                                row.lineType === "credit_taxes" && "bg-sky-50/40",
                              )}
                            >
                              <td className="px-3 py-2 font-mono font-medium">{row.jeNumber}</td>
                              <td className="px-3 py-2">{row.property}</td>
                              <td className="px-3 py-2">{row.lineNum}</td>
                              <td className="px-3 py-2 font-mono">{row.account}{row.accountName ? ` ${row.accountName}` : ""}</td>
                              <td className="px-3 py-2 font-semibold text-rose-700">{parseFloat(row.debit || 0) > 0 ? `$${row.debit}` : ""}</td>
                              <td className="px-3 py-2 font-semibold text-emerald-700">{parseFloat(row.credit || 0) > 0 ? `$${row.credit}` : ""}</td>
                              <td className="px-3 py-2 text-[11px]">{row.qboClass}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(stage?.rows || []).some((r) => (r.issues || []).some((i) => i.code === "JE_IMBALANCE")) && (
                      <div className="mt-3 rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                        Journal entry imbalance detected. Total debits do not equal total credits. Investigate before proceeding.
                      </div>
                    )}
                  </section>
                )}
                <FiltersBar
                  filters={filters}
                  employees={employees}
                  properties={properties}
                  issueTypeOptions={issueTypeOptions}
                  onChange={setFilter}
                  onToggleIssueType={toggleIssueType}
                />

                <WorkspaceTable
                  stageName={stage.name}
                  rows={sortedRows}
                  selectedRowId={selectedRowId}
                  highlightedRowIds={highlightedRowIds}
                  employeeOptions={referenceEmployees}
                  propertyOptions={referenceProperties}
                  onSelectRow={selectRow}
                  onCellChange={(rowId, field, value) =>
                    updateCell({
                      stageId: stage.id,
                      rowId,
                      field,
                      value,
                    })
                  }
                  onApplyRowFix={(rowId) => {
                    applyAiFix(rowId);
                    pushToast("Fix applied");
                  }}
                  onIgnoreRow={(rowId) => {
                    ignoreRowIssue({ stageId: stage.id, rowId });
                    pushToast("Issue ignored");
                  }}
                  onFixSimilar={(pattern) => {
                    fixAllSimilarIssues({ stageId: stage.id, pattern });
                    pushToast("Bulk fix applied");
                  }}
                  onIgnoreSimilar={(pattern) => {
                    ignoreAllSimilarIssues({ stageId: stage.id, pattern });
                    pushToast("Ignored similar issues");
                  }}
                  sortState={{ direction: varianceSortDirection }}
                  onSortVariance={(event) => {
                    event.stopPropagation();
                    setVarianceSortDirection((prev) =>
                      prev === "" ? "desc" : prev === "desc" ? "asc" : "",
                    );
                  }}
                  onIssueAction={async ({ rowId, issueCode, action }) => {
                    await resolveIssueAction({ stageId: stage.id, rowId, issueCode, action });
                    pushToast(`Issue marked as ${action}`);
                  }}
                  onMapEmployee={async ({ sourceName, targetEmployee }) => {
                    await applyEmployeeMapping({ sourceName, targetEmployee, persistGlobal });
                    pushToast("Employee mapping applied");
                  }}
                  onMapProperty={async ({ sourceProperty, targetProperty }) => {
                    await applyPropertyMapping({ sourceProperty, targetProperty, persistGlobal });
                    pushToast("Property mapping applied");
                  }}
                  onRequestPropertyApproval={async ({ sourceProperty, proposedProperty }) => {
                    await requestPropertyApproval({ sourceProperty, proposedProperty });
                    pushToast("Property pending approval");
                  }}
                />
              </>
            )}

            <AuditTimeline entries={currentRun.auditLog} />
          </section>

        </div>
        <button
          className="fixed bottom-4 right-4 z-40 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800"
          onClick={() => setCopilotOpen((value) => !value)}
        >
          {copilotOpen ? "Hide AI Copilot" : "AI Copilot"}
        </button>
        {copilotOpen && (
          <div className="fixed bottom-16 right-4 z-40 h-[74vh] w-[380px] max-w-[calc(100vw-2rem)]">
            <AICopilotPanel
              messages={aiMessages}
              onAsk={askCopilot}
              onApplyFix={() => {
                applyAiFix();
                pushToast("Fix applied");
              }}
              aiLoading={aiLoading}
              affectedRowsCount={affectedRowsCount}
              contextTitle={
                isPayrollCalculationStage ? "AI Copilot - Payroll Calculation"
                : isQBOBillsStage ? "AI Copilot - QBO Bills"
                : isJournalEntryStage ? "AI Copilot - Journal Entry"
                : "AI Copilot"
              }
              contextSubtitle={
                isPayrollCalculationStage
                  ? "Clarify flagged payroll rows and prepare export."
                  : isQBOBillsStage
                    ? "Review 1099 contractor bills, verify routing and amounts."
                    : isJournalEntryStage
                      ? "Verify 3-line rule, debit/credit balance, and account routing."
                      : "Context aware by stage + selected row."
              }
            />
          </div>
        )}

      {overrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Blocking issues detected</h2>
            <p className="mt-2 text-sm text-slate-600">
              Resolve {errorsCount} blocking issues before continuing, or override with reason.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border border-slate-200 p-2 text-sm"
              rows={3}
              placeholder="Enter override reason for audit log..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setOverrideOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={!reason.trim() || isValidating}
                onClick={handleOverride}
              >
                {isValidating ? "Applying..." : "Override & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
      {backConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Unsaved changes detected</h2>
            <p className="mt-2 text-sm text-slate-600">You have unsaved changes. Continue?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setBackConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
                onClick={() => {
                  setBackConfirmOpen(false);
                  goToPreviousStage();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {discardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Discard Payroll Run?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete all uploaded data, validations, and progress. This action cannot be undone.
            </p>
            <p className="mt-3 text-xs text-slate-500">Type DELETE to confirm.</p>
            <input
              value={confirmDeleteText}
              onChange={(event) => setConfirmDeleteText(event.target.value)}
              className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                onClick={() => {
                  setDiscardOpen(false);
                  setConfirmDeleteText("");
                }}
              >
                Cancel
              </button>
              <button
                className="rounded bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={confirmDeleteText !== "DELETE"}
                onClick={handleDiscardRun}
              >
                Confirm Discard
              </button>
            </div>
          </div>
        </div>
      )}
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

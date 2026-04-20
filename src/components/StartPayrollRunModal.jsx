import { useMemo, useState } from "react";
import { getWeekdayName, getWeekEnd, isMonday } from "../utils/date";
import { parseAndValidateCsv } from "../utils/csvValidation";

const stepLabels = [
  { id: 1, label: "Pay Period" },
  { id: 2, label: "File Ingestion" },
  { id: 3, label: "Confirm & Run" },
];

const requiredFiles = [
  { key: "timesheet", label: "QBT Timesheet" },
  { key: "mileage", label: "QBT Mileage" },
  { key: "reservations", label: "Hospitable Reservations" },
];

export default function StartPayrollRunModal({ open, onClose, onSubmit, busy }) {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [fileState, setFileState] = useState({});
  const [dragOverKey, setDragOverKey] = useState("");
  const [issuesModalKey, setIssuesModalKey] = useState("");
  const [recentlyUploadedKey, setRecentlyUploadedKey] = useState("");
  const [validationError, setValidationError] = useState("");

  const endDate = useMemo(() => (startDate ? getWeekEnd(startDate) : ""), [startDate]);
  const weekdayName = useMemo(() => (startDate ? getWeekdayName(startDate) : ""), [startDate]);
  const hasFileErrors = Object.values(fileState).some((file) => file?.status === "Errors");
  const allFilesUploaded = requiredFiles.every((file) => fileState[file.key]);
  const mondayValid = startDate && isMonday(startDate);
  const stepProgress = (step / 3) * 100;
  const uploadedCount = Object.values(fileState).filter(Boolean).length;
  const validCount = Object.values(fileState).filter((file) => file?.status === "Valid").length;
  const warningCount = Object.values(fileState).filter((file) => file?.status === "Warnings").length;
  const errorCount = Object.values(fileState).filter((file) => file?.status === "Errors").length;
  const readiness = Math.round((validCount / requiredFiles.length) * 100);
  const currentIssues = issuesModalKey ? fileState[issuesModalKey] : null;

  if (!open) return null;

  const handleFileUpload = async (fileKey, file) => {
    if (!file) return;

    setFileState((state) => ({
      ...state,
      [fileKey]: {
        fileName: file.name,
        status: "Uploading",
      },
    }));

    try {
      const result = await parseAndValidateCsv(fileKey, file);
      setFileState((state) => ({
        ...state,
        [fileKey]: result,
      }));
      setRecentlyUploadedKey(fileKey);
      setTimeout(() => {
        setRecentlyUploadedKey((value) => (value === fileKey ? "" : value));
      }, 900);
    } catch (error) {
      setFileState((state) => ({
        ...state,
        [fileKey]: {
          fileName: file.name,
          status: "Errors",
          rowCount: 0,
          preview: [],
          errors: [error.message || "Unable to parse this file"],
          warnings: [],
        },
      }));
    }
    setValidationError("");
  };

  const handleInitialize = async () => {
    if (!mondayValid || hasFileErrors || !allFilesUploaded) {
      setValidationError("Fix file issues before proceeding");
      return;
    }

    await onSubmit({
      runName: `Payroll ${startDate} to ${endDate}`,
      payPeriodStart: startDate,
      payPeriodEnd: endDate,
      fileSummary: requiredFiles.map((file) => ({
        name: file.label,
        fileName: fileState[file.key]?.fileName,
        rowCount: fileState[file.key]?.rowCount || 0,
        status: fileState[file.key]?.status,
        errors: fileState[file.key]?.errors || [],
        warnings: fileState[file.key]?.warnings || [],
      })),
      uploads: fileState,
    });
  };

  const handleRemoveFile = (fileKey) => {
    setFileState((state) => {
      const nextState = { ...state };
      delete nextState[fileKey];
      return nextState;
    });
    setValidationError("");
  };

  const canContinue =
    (step === 1 && startDate && mondayValid) ||
    (step === 2 && allFilesUploaded && !hasFileErrors) ||
    step === 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-6xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Start Payroll Run</h2>
          <button className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide">Step {step} of 3</p>
            <p className="font-medium">{stepLabels[step - 1].label}</p>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-sky-600 transition-all duration-300" style={{ width: `${stepProgress}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {stepLabels.map((stepItem) => (
              <span
                key={stepItem.id}
                className={`rounded-md px-3 py-1 text-center ${
                  stepItem.id === step ? "bg-sky-600 font-semibold text-white" : "bg-white text-slate-500"
                }`}
              >
                Step {stepItem.id}: {stepItem.label}
              </span>
            ))}
          </div>
        </div>

        {step === 2 && (
          <div className="mb-3">
            <h3 className="text-base font-semibold text-slate-800">Upload Required Files</h3>
            <p className="mt-1 text-xs text-slate-500">
              Ensure files match required format. Invalid rows will be flagged in the next step.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-medium text-slate-700">
                {uploadedCount} Files Uploaded | {errorCount} Error{errorCount === 1 ? "" : "s"} | {validCount} Valid
              </span>
              {warningCount > 0 && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                  {warningCount} Warning{warningCount === 1 ? "" : "s"}
                </span>
              )}
              <span className="ml-auto rounded bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                Data readiness: {readiness}%
              </span>
            </div>
          </div>
        )}

        <div key={step} className="relative min-h-[340px] overflow-hidden animate-stepFadeIn">
          <div
            className="transition-all duration-250"
            style={{
              opacity: 1,
              transform: "translateX(0)",
            }}
          >
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Select pay period start date (must be Monday).</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
                {startDate && (
                  <p className="text-sm text-slate-600">
                    Selected weekday: <span className="font-semibold">{weekdayName}</span>
                  </p>
                )}
                {startDate && !mondayValid && (
                  <p className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-sm font-medium text-rose-700">
                    Start date must be Monday.
                  </p>
                )}
                {mondayValid && (
                  <p className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-700">
                    End date auto-calculated: {endDate}
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  {requiredFiles.map((file) => {
                    const uploaded = fileState[file.key];
                    const statusText =
                      uploaded?.status === "Valid"
                        ? "Valid"
                        : uploaded?.status === "Warnings"
                          ? "Warning"
                          : uploaded?.status === "Errors"
                            ? "Error"
                            : uploaded?.status === "Uploading"
                              ? "Parsing"
                              : "Pending";
                    const statusTone =
                      uploaded?.status === "Valid"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : uploaded?.status === "Warnings"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : uploaded?.status === "Errors"
                            ? "bg-rose-100 text-rose-700 border-rose-200"
                            : uploaded?.status === "Uploading"
                              ? "bg-sky-100 text-sky-700 border-sky-200"
                              : "bg-slate-100 text-slate-600 border-slate-200";
                    const issues = [...(uploaded?.errors || []), ...(uploaded?.warnings || [])];

                    return (
                      <div
                        key={file.key}
                        className={`relative rounded-xl border border-slate-200 p-4 shadow-sm transition hover:border-sky-300 hover:shadow ${
                          recentlyUploadedKey === file.key ? "ring-2 ring-emerald-200" : ""
                        }`}
                      >
                        <span className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone}`}>
                          {uploaded?.status === "Uploading" && (
                            <span className="mr-1 inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                          )}
                          {statusText}
                        </span>
                        <p className="mb-3 text-sm font-semibold text-slate-800">{file.label}</p>
                        <div
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverKey(file.key);
                          }}
                          onDragLeave={() => setDragOverKey("")}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragOverKey("");
                            const droppedFile = event.dataTransfer.files?.[0];
                            handleFileUpload(file.key, droppedFile);
                          }}
                          className={`rounded-lg border border-dashed p-4 text-center transition ${
                            dragOverKey === file.key
                              ? "border-sky-400 bg-sky-50"
                              : "border-slate-300 bg-slate-50 hover:border-sky-300"
                          }`}
                        >
                          <p className="text-xs text-slate-500">Drag & drop CSV here</p>
                          <p className="my-2 text-xs text-slate-400">or</p>
                          <label className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                            Browse file
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={(event) => handleFileUpload(file.key, event.target.files?.[0])}
                            />
                          </label>
                        </div>

                        {uploaded && (
                          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-medium text-slate-700">{uploaded.fileName}</p>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(file.key)}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                aria-label={`Remove ${uploaded.fileName}`}
                                title="Remove file"
                              >
                                ×
                              </button>
                            </div>
                            {uploaded.status !== "Uploading" && (
                              <p className="text-slate-500">Rows: {uploaded.rowCount || 0}</p>
                            )}
                            {uploaded.status === "Uploading" && (
                              <p className="text-sky-600">Parsing file...</p>
                            )}
                            {issues.slice(0, 2).map((issue) => (
                              <p
                                key={`${file.key}-${issue}`}
                                className={uploaded.errors?.includes(issue) ? "text-rose-600" : "text-amber-600"}
                              >
                                • {issue}
                              </p>
                            ))}
                            {issues.length > 0 && (
                              <button
                                type="button"
                                className="text-left font-medium text-sky-600 hover:text-sky-700"
                                onClick={() => setIssuesModalKey(file.key)}
                              >
                                View issues
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasFileErrors && (
                  <p className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-sm font-medium text-rose-700">
                    Fix file issues before proceeding
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="text-base font-semibold text-slate-800">Confirm payroll run initialization</p>
                <p className="text-slate-600">Pay period: {startDate} to {endDate}</p>
                <p className="text-slate-600">Files ready: {Object.values(fileState).filter(Boolean).length} / 3</p>
                <p className="text-xs text-slate-500">This run will enter Processing immediately with transparent stage logs.</p>
              </div>
            )}
          </div>
        </div>

        {validationError && <p className="mt-3 text-sm text-rose-600">{validationError}</p>}

        <div className="mt-6 flex justify-between gap-2">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            disabled={step === 1}
            onClick={() => setStep((value) => Math.max(1, value - 1))}
          >
            Back
          </button>
          {step < 3 ? (
            <div className="text-right">
              <div title={!canContinue && step === 2 ? "Resolve file issues to continue" : ""}>
                <button
                  className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canContinue}
                  onClick={() => setStep((value) => value + 1)}
                >
                  Continue
                </button>
              </div>
              {!canContinue && step === 2 && (
                <p className="mt-1 text-xs text-rose-600">Resolve file issues to continue.</p>
              )}
            </div>
          ) : (
            <button
              disabled={busy}
              className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
              onClick={handleInitialize}
            >
              {busy ? "Initializing..." : "Initialize Payroll Run"}
            </button>
          )}
        </div>
      </div>
      {issuesModalKey && currentIssues && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">
                File Issues: {currentIssues.fileName}
              </h4>
              <button
                type="button"
                onClick={() => setIssuesModalKey("")}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 font-medium text-rose-700">Errors</p>
                {currentIssues.errors?.length ? (
                  currentIssues.errors.map((issue) => (
                    <p key={`error-${issue}`} className="rounded bg-rose-50 px-2 py-1 text-rose-700">
                      {issue}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500">No errors</p>
                )}
              </div>
              <div>
                <p className="mb-1 font-medium text-amber-700">Warnings</p>
                {currentIssues.warnings?.length ? (
                  currentIssues.warnings.map((issue) => (
                    <p key={`warning-${issue}`} className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                      {issue}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500">No warnings</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

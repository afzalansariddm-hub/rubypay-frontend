import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../services/api";

const STAGE_DISPLAY_ORDER = [
  "Data Validation",
  "Mileage Verification",
  "Timesheet Review",
  "Payroll Calculation",
  "QBO Bills",
  "Journal Entry",
  "Accounting & Export",
];

const normalizeRunStageOrder = (run) => {
  if (!run?.stages) {
    return run;
  }
  const orderedStages = [...run.stages].sort(
    (a, b) => STAGE_DISPLAY_ORDER.indexOf(a.name) - STAGE_DISPLAY_ORDER.indexOf(b.name),
  );

  const mileageStage = orderedStages.find((stage) => stage.name === "Mileage Verification");
  const timesheetStage = orderedStages.find((stage) => stage.name === "Timesheet Review");
  const mileageApproved = mileageStage?.status === "Completed";

  if (timesheetStage) {
    timesheetStage.locked = !mileageApproved;
    if (!mileageApproved && timesheetStage.status === "In Progress") {
      timesheetStage.status = "Not Started";
    }
  }

  return {
    ...run,
    stages: orderedStages,
  };
};

const buildCompactRunPayload = (run) => {
  if (!run) {
    return null;
  }

  const compactStages = (run.stages || []).map((stage) => ({
    id: stage.id,
    name: stage.name,
    status: stage.status,
    errorCount: stage.errorCount,
    warningCount: stage.warningCount,
    locked: stage.locked,
    summary: stage.summary,
    rows: (stage.rows || []).map((row) => ({
      id: row.id,
      employee: row.employee,
      property: row.property,
      sourceEmployeeName: row.sourceEmployeeName,
      sourcePropertyName: row.sourcePropertyName,
      mappedEmployee: row.mappedEmployee,
      mappedProperty: row.mappedProperty,
      hours: row.hours,
      rate: row.rate,
      total: row.total,
      jobNotes: row.jobNotes,
      hireDate: row.hireDate,
      regularHours: row.regularHours,
      overtimeHours: row.overtimeHours,
      weekendHours: row.weekendHours,
      holidayHours: row.holidayHours,
      regularPay: row.regularPay,
      overtimePay: row.overtimePay,
      weekendPay: row.weekendPay,
      holidayPay: row.holidayPay,
      mileageRate: row.mileageRate,
      mileageAmount: row.mileageAmount,
      reportedMiles: row.reportedMiles,
      verifiedMiles: row.verifiedMiles,
      variance: row.variance,
      clarificationStatus: row.clarificationStatus,
      recurringAdjustments: row.recurringAdjustments,
      recurringAdjustmentNotes: row.recurringAdjustmentNotes,
      mileage: row.mileage,
      grossPay: row.grossPay,
      lineType: row.lineType,
      // QBO Bills fields
      vendorName: row.vendorName,
      billDate: row.billDate,
      dueDate: row.dueDate,
      billNumber: row.billNumber,
      billTotal: row.billTotal,
      lines: row.lines,
      // Journal Entry fields
      jeNumber: row.jeNumber,
      lineNum: row.lineNum,
      account: row.account,
      accountName: row.accountName,
      debit: row.debit,
      credit: row.credit,
      qboClass: row.qboClass,
      description: row.description,
      error: row.error,
      warning: row.warning,
      issues: row.issues,
      aiSuggestion: row.aiSuggestion,
      touched: row.touched,
    })),
  }));

  return {
    id: run.id,
    runName: run.runName,
    status: run.status,
    progress: run.progress,
    activeStageId: run.activeStageId,
    referenceOptions: run.referenceOptions,
    employeeMappings: run.employeeMappings,
    propertyMappings: run.propertyMappings,
    pendingPropertyApprovals: run.pendingPropertyApprovals,
    firstPaycheckOfMonth: run.firstPaycheckOfMonth,
    recurringAdjustments: run.recurringAdjustments,
    stages: compactStages,
    auditLog: run.auditLog,
    payroll: run.payroll,
    orchestration: run.orchestration,
  };
};

export const usePayrollStore = create(
  persist(
    (set, get) => ({
      runs: [],
      currentRun: null,
      selectedStageId: null,
      selectedRowId: null,
      filters: {
        employee: "",
        property: "",
        searchQuery: "",
        onlyErrors: false,
      },
      aiMessages: [],
      aiLoading: false,
      highlightedRowIds: [],
      affectedRowsCount: 0,
      historyPast: [],
      historyFuture: [],
      isDirty: false,
      loading: false,
      error: "",
      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
          },
        })),
      selectStage: (stageId) => set({ selectedStageId: stageId, selectedRowId: null }),
      selectRow: (rowId) => set({ selectedRowId: rowId }),
      goToPreviousStage: () =>
        set((state) => {
          if (!state.currentRun || !state.selectedStageId) {
            return state;
          }
          const index = state.currentRun.stages.findIndex((stage) => stage.id === state.selectedStageId);
          if (index <= 0) {
            return state;
          }
          const updatedRun = structuredClone(state.currentRun);
          const previousStage = updatedRun.stages[index - 1];
          updatedRun.activeStageId = previousStage.id;
          updatedRun.lastUpdated = new Date().toISOString();
          updatedRun.auditLog.unshift({
            id: `audit-${Date.now()}`,
            actor: "Payroll Manager",
            type: "STAGE_BACK_NAVIGATION",
            details: `Moved back to ${previousStage.name}`,
            createdAt: new Date().toISOString(),
          });
          return {
            currentRun: updatedRun,
            selectedStageId: previousStage.id,
            selectedRowId: null,
            isDirty: true,
          };
        }),
      fetchRuns: async () => {
        set({ loading: true, error: "" });
        try {
          const runs = await api.listRuns();
          set({ runs, loading: false });
        } catch (error) {
          set({ loading: false, error: error.message });
        }
      },
      fetchRun: async (id) => {
        set({ loading: true, error: "" });
        try {
          const run = normalizeRunStageOrder(await api.getRun(id));
          set({
            currentRun: run,
            selectedStageId: run.activeStageId || run.stages[0]?.id,
            loading: false,
            isDirty: false,
          });
        } catch (error) {
          set({ loading: false, error: error.message });
        }
      },
      createRun: async (payload) => {
        const run = normalizeRunStageOrder(await api.createRun(payload));
        set((state) => ({
          currentRun: run,
          runs: [run, ...state.runs],
          selectedStageId: run.activeStageId,
          isDirty: false,
        }));
        return run;
      },
      startRun: async (id) => {
        const run = normalizeRunStageOrder(await api.startRun(id));
        set({
          currentRun: run,
          selectedStageId: run.activeStageId || run.stages[0]?.id,
          isDirty: false,
        });
        return run;
      },
      validateStage: async ({ stageId, overrideReason, payload }) => {
        const currentRun = get().currentRun;
        const run = payload || currentRun;
        if (!run) {
          return;
        }
        const compactPayload = buildCompactRunPayload(run);

        const updated = overrideReason
          ? await api.overrideStage(run.id, { stageId, reason: overrideReason, payload: compactPayload })
          : await api.validateStage(run.id, { stageId, payload: compactPayload });

        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, selectedStageId: normalized.activeStageId || stageId, isDirty: false });
      },
      askCopilot: async (prompt) => {
        const { currentRun, selectedStageId, selectedRowId } = get();
        if (!currentRun) {
          return;
        }

        set({ aiLoading: true });
        try {
          const stage = currentRun.stages.find((item) => item.id === selectedStageId) || currentRun.stages[0];
          const row = stage?.rows.find((item) => item.id === selectedRowId);
          const response = await api.askCopilot(currentRun.id, {
            prompt,
            stageId: stage?.id,
            rowId: row?.id,
          });
          const affectedRows = stage?.rows.filter((item) => item.error || item.warning) || [];
          const highlightedRowIds = row ? [row.id] : affectedRows.map((item) => item.id);

          const reply = {
            id: `ai-${Date.now()}`,
            prompt,
            content: response.content,
            createdAt: response.createdAt || new Date().toISOString(),
            stageId: response.stageId || stage?.id,
            rowId: response.rowId || row?.id,
          };
          set((state) => ({
            aiMessages: [reply, ...state.aiMessages],
            aiLoading: false,
            highlightedRowIds,
            affectedRowsCount: highlightedRowIds.length,
          }));
        } catch (error) {
          const reply = {
            id: `ai-${Date.now()}`,
            prompt,
            content: error.message || "AI Copilot request failed",
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            aiMessages: [reply, ...state.aiMessages],
            aiLoading: false,
          }));
        }
      },
      updateCell: ({ stageId, rowId, field, value }) =>
        set((state) => {
          if (!state.currentRun) {
            return state;
          }

          const snapshot = JSON.stringify(state.currentRun);
          const updatedRun = structuredClone(state.currentRun);
          const stage = updatedRun.stages.find((item) => item.id === stageId);
          const row = stage?.rows.find((item) => item.id === rowId);

          if (!row) {
            return state;
          }

          const beforeValue = row[field];
          row[field] = value;
          row.touched = true;
          if (["error", "warning"].includes(field) && !value) {
            row.aiSuggestion = "Issue manually clarified";
          }
          updatedRun.lastUpdated = new Date().toISOString();
          updatedRun.auditLog.unshift({
            id: `audit-${Date.now()}`,
            actor: "Payroll Manager",
            type: "CELL_EDIT",
            details: `${field} changed for ${row.employee}`,
            before: beforeValue,
            after: value,
            createdAt: new Date().toISOString(),
          });

          return {
            currentRun: updatedRun,
            historyPast: [...state.historyPast, snapshot],
            historyFuture: [],
            isDirty: true,
          };
        }),
      applyAiFix: (rowId) =>
        set((state) => {
          if (!state.currentRun || state.aiMessages.length === 0) {
            return state;
          }

          const latestMessage = state.aiMessages[0];
          const updatedRun = structuredClone(state.currentRun);
          const stage = updatedRun.stages.find((item) => item.id === latestMessage.stageId);
          const row = stage?.rows.find((item) => item.id === (rowId || latestMessage.rowId));

          if (!row) {
            return state;
          }

          row.error = "";
          row.warning = "";
          row.issues = (row.issues || []).map((issue) => ({ ...issue, status: "resolved" }));
          row.aiSuggestion = "Applied by AI Copilot";
          stage.errorCount = Math.max(0, stage.errorCount - 1);
          stage.warningCount = Math.max(0, stage.warningCount - 1);
          updatedRun.auditLog.unshift({
            id: `audit-${Date.now()}`,
            actor: "AI Copilot",
            type: "AI_FIX_APPLIED",
            details: `Applied fix on ${row.employee} in ${stage.name}`,
            createdAt: new Date().toISOString(),
          });
          updatedRun.lastUpdated = new Date().toISOString();

          return {
            currentRun: updatedRun,
            isDirty: true,
          };
        }),
      ignoreRowIssue: ({ stageId, rowId }) =>
        set((state) => {
          if (!state.currentRun) {
            return state;
          }
          const updatedRun = structuredClone(state.currentRun);
          const stage = updatedRun.stages.find((item) => item.id === stageId);
          const row = stage?.rows.find((item) => item.id === rowId);
          if (!row || (!row.error && !row.warning)) {
            return state;
          }

          const hadError = Boolean(row.error);
          const hadWarning = Boolean(row.warning);
          row.error = "";
          row.warning = "";
          row.issues = (row.issues || []).map((issue) => ({ ...issue, status: "ignored" }));
          row.aiSuggestion = "Ignored by reviewer";
          if (hadError) {
            stage.errorCount = Math.max(0, stage.errorCount - 1);
          }
          if (hadWarning) {
            stage.warningCount = Math.max(0, stage.warningCount - 1);
          }
          updatedRun.auditLog.unshift({
            id: `audit-${Date.now()}`,
            actor: "Payroll Manager",
            type: "ROW_IGNORED",
            details: `Issue ignored for ${row.employee}`,
            createdAt: new Date().toISOString(),
          });
          updatedRun.lastUpdated = new Date().toISOString();

          return { currentRun: updatedRun, isDirty: true };
        }),
      fixAllSimilarIssues: ({ stageId, pattern }) =>
        set((state) => {
          if (!state.currentRun) {
            return state;
          }
          const updatedRun = structuredClone(state.currentRun);
          const stage = updatedRun.stages.find((item) => item.id === stageId);
          if (!stage) {
            return state;
          }

          let fixedCount = 0;
          stage.rows.forEach((row) => {
            if ((row.error && row.error === pattern) || (row.warning && row.warning === pattern)) {
              if (row.error) {
                stage.errorCount = Math.max(0, stage.errorCount - 1);
              }
              if (row.warning) {
                stage.warningCount = Math.max(0, stage.warningCount - 1);
              }
              row.error = "";
              row.warning = "";
              row.issues = (row.issues || []).map((issue) => ({ ...issue, status: "resolved" }));
              row.aiSuggestion = "Bulk fix applied";
              fixedCount += 1;
            }
          });

          if (fixedCount === 0) {
            return state;
          }

          updatedRun.auditLog.unshift({
            id: `audit-${Date.now()}`,
            actor: "AI Copilot",
            type: "BULK_FIX_APPLIED",
            details: `${fixedCount} similar issue(s) fixed in ${stage.name}`,
            createdAt: new Date().toISOString(),
          });
          updatedRun.lastUpdated = new Date().toISOString();

          return {
            currentRun: updatedRun,
            highlightedRowIds: [],
            affectedRowsCount: fixedCount,
            isDirty: true,
          };
        }),
      undo: () =>
        set((state) => {
          if (state.historyPast.length === 0 || !state.currentRun) {
            return state;
          }

          const previous = state.historyPast[state.historyPast.length - 1];
          const rest = state.historyPast.slice(0, -1);
          const currentSnapshot = JSON.stringify(state.currentRun);

          return {
            currentRun: JSON.parse(previous),
            historyPast: rest,
            historyFuture: [currentSnapshot, ...state.historyFuture],
            isDirty: true,
          };
        }),
      redo: () =>
        set((state) => {
          if (state.historyFuture.length === 0 || !state.currentRun) {
            return state;
          }

          const [next, ...rest] = state.historyFuture;
          const currentSnapshot = JSON.stringify(state.currentRun);

          return {
            currentRun: JSON.parse(next),
            historyPast: [...state.historyPast, currentSnapshot],
            historyFuture: rest,
            isDirty: true,
          };
        }),
      saveAndExitRun: async () => {
        const run = get().currentRun;
        if (!run) {
          return null;
        }
        const compactPayload = buildCompactRunPayload(run);
        const updated = await api.saveAndExit(run.id, {
          payload: compactPayload,
          actor: "Payroll Manager",
        });
        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, isDirty: false });
        return normalized;
      },
      discardCurrentRun: async () => {
        const run = get().currentRun;
        if (!run) {
          return;
        }

        try {
          await api.discardRun(run.id);
        } catch (error) {
          // If backend restarted or route is stale, allow local discard fallback.
          if (error?.status !== 404) {
            throw error;
          }
        }

        set((state) => ({
          currentRun: null,
          runs: state.runs.filter((item) => item.id !== run.id),
          selectedStageId: null,
          selectedRowId: null,
          highlightedRowIds: [],
          affectedRowsCount: 0,
          isDirty: false,
        }));
      },
      exportPayroll: async () => {
        const run = get().currentRun;
        if (!run) {
          return null;
        }
        return api.exportPayroll(run.id);
      },
      resolveIssueAction: async ({ stageId, rowId, issueCode, action }) => {
        const run = get().currentRun;
        if (!run) {
          return;
        }
        const updated = await api.resolveStageIssue(run.id, {
          stageId,
          rowId,
          issueCode,
          action,
          actor: "Payroll Manager",
        });
        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, isDirty: false });
      },
      applyEmployeeMapping: async ({ sourceName, targetEmployee, persistGlobal = false }) => {
        const run = get().currentRun;
        if (!run) {
          return;
        }
        const updated = await api.applyEmployeeMapping(run.id, {
          sourceName,
          targetEmployee,
          persistGlobal,
          actor: "Payroll Manager",
        });
        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, isDirty: false });
      },
      applyPropertyMapping: async ({ sourceProperty, targetProperty, persistGlobal = false }) => {
        const run = get().currentRun;
        if (!run) {
          return;
        }
        const updated = await api.applyPropertyMapping(run.id, {
          sourceProperty,
          targetProperty,
          persistGlobal,
          actor: "Payroll Manager",
        });
        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, isDirty: false });
      },
      requestPropertyApproval: async ({ sourceProperty, proposedProperty }) => {
        const run = get().currentRun;
        if (!run) {
          return;
        }
        const updated = await api.requestPropertyApproval(run.id, {
          sourceProperty,
          proposedProperty,
          actor: "Payroll Manager",
        });
        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, isDirty: false });
      },
      resolvePropertyApproval: async ({ requestId, action, approvedPropertyName, persistGlobal = false }) => {
        const run = get().currentRun;
        if (!run) {
          return;
        }
        const updated = await api.resolvePropertyApproval(run.id, {
          requestId,
          action,
          approvedPropertyName,
          persistGlobal,
          actor: "Payroll Manager",
        });
        const normalized = normalizeRunStageOrder(updated);
        set({ currentRun: normalized, isDirty: false });
      },
    }),
    {
      name: "payroll-engine-store",
      partialize: (state) => ({
        currentRun: state.currentRun,
        selectedStageId: state.selectedStageId,
        selectedRowId: state.selectedRowId,
        aiMessages: state.aiMessages,
        historyPast: state.historyPast,
        historyFuture: state.historyFuture,
        isDirty: state.isDirty,
      }),
    },
  ),
);

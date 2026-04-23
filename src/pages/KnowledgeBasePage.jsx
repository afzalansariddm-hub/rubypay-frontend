import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const parseEditableValue = (value) => {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return "";
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (!Number.isNaN(Number(raw)) && raw !== "") return Number(raw);
  if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
    try {
      return JSON.parse(raw);
    } catch {
      return value;
    }
  }
  return value;
};

const toDisplayValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTableKey, setSelectedTableKey] = useState("");
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [draftRow, setDraftRow] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = (message) => {
    const toast = { id: `toast-${Date.now()}`, message };
    setToasts((items) => [toast, ...items].slice(0, 3));
    setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== toast.id));
    }, 2200);
  };

  const loadTables = useCallback(async () => {
    const data = await api.listKnowledgeBaseTables();
    setTables(data);
    return data;
  }, []);

  const loadTableRows = useCallback(async (tableKey) => {
    if (!tableKey) return;
    setIsLoading(true);
    try {
      const payload = await api.getKnowledgeBaseTable(tableKey);
      setRows(payload.rows || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectTable = async (tableKey) => {
    setSelectedTableKey(tableKey);
    setEditingRowIndex(null);
    setDraftRow({});
    await loadTableRows(tableKey);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await loadTables();
      if (!active || data.length === 0) return;
      const initialKey = data[0].key;
      setSelectedTableKey(initialKey);
      await loadTableRows(initialKey);
    })();
    return () => {
      active = false;
    };
  }, [loadTables, loadTableRows]);

  const selectedTable = tables.find((table) => table.key === selectedTableKey);

  const columns = useMemo(() => {
    const keys = new Set();
    rows.forEach((row) => {
      Object.keys(row || {}).forEach((key) => {
        if (key !== "__rowIndex") {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((column) => toDisplayValue(row[column]).toLowerCase().includes(query)),
    );
  }, [rows, columns, searchQuery]);

  const startEditing = (row) => {
    setEditingRowIndex(row.__rowIndex);
    const nextDraft = {};
    columns.forEach((column) => {
      nextDraft[column] = toDisplayValue(row[column]);
    });
    setDraftRow(nextDraft);
  };

  const cancelEditing = () => {
    setEditingRowIndex(null);
    setDraftRow({});
  };

  const saveEditedRow = async () => {
    if (editingRowIndex === null) return;
    setIsSaving(true);
    try {
      const payload = {};
      Object.entries(draftRow).forEach(([key, value]) => {
        payload[key] = parseEditableValue(value);
      });
      await api.updateKnowledgeBaseRow(selectedTableKey, editingRowIndex, { row: payload });
      await loadTables();
      await loadTableRows(selectedTableKey);
      pushToast("Row updated");
      cancelEditing();
    } catch (error) {
      pushToast(error.message || "Failed to update row");
    } finally {
      setIsSaving(false);
    }
  };

  const addRow = async () => {
    setIsSaving(true);
    try {
      const payload = {};
      columns.forEach((column) => {
        payload[column] = "";
      });
      await api.createKnowledgeBaseRow(selectedTableKey, { row: payload });
      await loadTables();
      await loadTableRows(selectedTableKey);
      pushToast("Row created");
    } catch (error) {
      pushToast(error.message || "Failed to create row");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRow = async (rowIndex) => {
    setIsSaving(true);
    try {
      await api.deleteKnowledgeBaseRow(selectedTableKey, rowIndex);
      await loadTables();
      await loadTableRows(selectedTableKey);
      pushToast("Row deleted");
    } catch (error) {
      pushToast(error.message || "Failed to delete row");
    } finally {
      setIsSaving(false);
    }
  };

  const downloadFile = (file, fallbackName) => {
    const url = window.URL.createObjectURL(file.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.fileName || fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportTable = async (format) => {
    try {
      const file = await api.exportKnowledgeBaseTable(selectedTableKey, format);
      downloadFile(file, `${selectedTableKey}.${format}`);
      pushToast(`Exported ${format.toUpperCase()}`);
    } catch (error) {
      pushToast(error.message || "Table export failed");
    }
  };

  const exportKnowledgeBase = async () => {
    try {
      const file = await api.exportKnowledgeBase();
      downloadFile(file, "knowledgebase.json");
      pushToast("Knowledge base exported");
    } catch (error) {
      pushToast(error.message || "Knowledge base export failed");
    }
  };

  const importKnowledgeBase = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.importKnowledgeBase(parsed);
      const data = await loadTables();
      const fallbackKey = selectedTableKey || data[0]?.key || "";
      if (fallbackKey) {
        await loadTableRows(fallbackKey);
      }
      pushToast("Knowledge base imported");
    } catch (error) {
      pushToast(error.message || "Knowledge base import failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Knowledge Base</h1>
              <p className="text-sm text-slate-500">Reference data management with CRUD + JSON/CSV import/export.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>
              <button
                className="rounded border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                onClick={exportKnowledgeBase}
              >
                Export knowledgebase.json
              </button>
              <label className="cursor-pointer rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100">
                Import knowledgebase.json
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(event) => importKnowledgeBase(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Tables</h3>
            <div className="space-y-1">
              {tables.map((table) => (
                <button
                  key={table.key}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                    selectedTableKey === table.key
                      ? "bg-sky-100 text-sky-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => selectTable(table.key)}
                >
                  <span>{table.label}</span>
                  <span className="text-xs text-slate-500">{table.count}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-800">{selectedTable?.label || "Select table"}</h3>
              <input
                className="ml-auto min-w-[220px] rounded border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="Search rows..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button
                className="rounded border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50"
                onClick={() => exportTable("csv")}
                disabled={!selectedTableKey}
              >
                Export CSV
              </button>
              <button
                className="rounded border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50"
                onClick={() => exportTable("json")}
                disabled={!selectedTableKey}
              >
                Export JSON
              </button>
              <button
                className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                onClick={addRow}
                disabled={!selectedTableKey || isSaving}
              >
                Add Row
              </button>
            </div>

            {isLoading ? (
              <div className="rounded border border-slate-100 p-4 text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="overflow-auto rounded border border-slate-200">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      {columns.map((column) => (
                        <th key={column} className="px-2 py-2">{column}</th>
                      ))}
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={`${row.__rowIndex}-${selectedTableKey}`} className="border-t border-slate-100">
                        {columns.map((column) => (
                          <td key={column} className="px-2 py-1.5 align-top">
                            {editingRowIndex === row.__rowIndex ? (
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                value={draftRow[column] ?? ""}
                                onChange={(event) =>
                                  setDraftRow((state) => ({ ...state, [column]: event.target.value }))
                                }
                              />
                            ) : (
                              <span className="block max-w-[220px] truncate" title={toDisplayValue(row[column])}>
                                {toDisplayValue(row[column])}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-2 py-1.5 text-xs">
                          {editingRowIndex === row.__rowIndex ? (
                            <div className="flex gap-1">
                              <button
                                className="rounded border border-emerald-200 px-2 py-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                onClick={saveEditedRow}
                                disabled={isSaving}
                              >
                                Save
                              </button>
                              <button
                                className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                                onClick={() => startEditing(row)}
                              >
                                Edit
                              </button>
                              <button
                                className="rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                onClick={() => deleteRow(row.__rowIndex)}
                                disabled={isSaving}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td className="px-2 py-3 text-sm text-slate-500" colSpan={Math.max(2, columns.length + 1)}>
                          No rows found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>

      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            {toast.message}
          </div>
        ))}
      </div>
    </main>
  );
}


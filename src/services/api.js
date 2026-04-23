const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://rubypay-backend-production.up.railway.app" : "/api");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    let message = "API request failed";

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        message = parsed.message || message;
      } catch {
        message = responseText;
      }
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const responseText = await response.text().catch(() => "");
  if (!responseText) {
    return {};
  }
  return JSON.parse(responseText);
}

export const api = {
  listRuns: () => request("/runs"),
  createRun: (payload) =>
    request("/runs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getRun: (id) => request(`/runs/${id}`),
  startRun: (id) =>
    request(`/runs/${id}/start`, {
      method: "POST",
    }),
  validateStage: (id, payload) =>
    request(`/runs/${id}/validate-stage`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  overrideStage: (id, payload) =>
    request(`/runs/${id}/override`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resolveStageIssue: (id, payload) =>
    request(`/runs/${id}/issues/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  applyEmployeeMapping: (id, payload) =>
    request(`/runs/${id}/mappings/employee`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  applyPropertyMapping: (id, payload) =>
    request(`/runs/${id}/mappings/property`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  requestPropertyApproval: (id, payload) =>
    request(`/runs/${id}/properties/request-approval`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resolvePropertyApproval: (id, payload) =>
    request(`/runs/${id}/properties/resolve-approval`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  saveAndExit: (id, payload) =>
    request(`/runs/${id}/save-exit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  discardRun: (id) =>
    request(`/runs/${id}`, {
      method: "DELETE",
    }),
  askCopilot: (id, payload) =>
    request(`/ai/runs/${id}/copilot`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  exportPayroll: async (id) => {
    const response = await fetch(`${API_URL}/runs/${id}/export`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Export failed");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="(.+)"/i);
    return {
      blob,
      fileName: match?.[1] || `payroll-${id}.xlsx`,
    };
  },
  listKnowledgeBaseTables: () => request("/knowledge-base/tables"),
  getKnowledgeBaseTable: (tableKey) => request(`/knowledge-base/tables/${tableKey}`),
  createKnowledgeBaseRow: (tableKey, payload) =>
    request(`/knowledge-base/tables/${tableKey}/rows`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateKnowledgeBaseRow: (tableKey, rowIndex, payload) =>
    request(`/knowledge-base/tables/${tableKey}/rows/${rowIndex}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteKnowledgeBaseRow: (tableKey, rowIndex) =>
    request(`/knowledge-base/tables/${tableKey}/rows/${rowIndex}`, {
      method: "DELETE",
    }),
  importKnowledgeBase: (data) =>
    request("/knowledge-base/import", {
      method: "POST",
      body: JSON.stringify({ data }),
    }),
  exportKnowledgeBase: async () => {
    const response = await fetch(`${API_URL}/knowledge-base/export`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Knowledge base export failed");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="(.+)"/i);
    return {
      blob,
      fileName: match?.[1] || "knowledgebase.json",
    };
  },
  exportKnowledgeBaseTable: async (tableKey, format = "json") => {
    const response = await fetch(`${API_URL}/knowledge-base/tables/${tableKey}/export?format=${format}`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Table export failed");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="(.+)"/i);
    return {
      blob,
      fileName: match?.[1] || `${tableKey}.${format}`,
    };
  },
};

import { useState } from "react";

const defaultPrompts = [
  "Why is this flagged?",
  "Fix all employee mismatches",
  "Explain overtime calculation",
  "Summarize issues in this stage",
];

export default function AICopilotPanel({
  messages,
  onAsk,
  onApplyFix,
  aiLoading,
  affectedRowsCount,
  contextTitle = "AI Copilot",
  contextSubtitle = "Context aware by stage + selected row.",
  suggestedPrompts = defaultPrompts,
}) {
  const [prompt, setPrompt] = useState("");

  const sendPrompt = (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    onAsk(cleanText);
    setPrompt("");
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <h3 className="text-sm font-semibold text-slate-800">{contextTitle}</h3>
      <p className="mt-1 text-xs text-slate-500">{contextSubtitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedPrompts.map((item) => (
          <button
            key={item}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600"
            onClick={() => sendPrompt(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-auto">
        {aiLoading && (
          <p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs text-sky-700">
            AI is analyzing selected stage...
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm">
            <p className="text-xs font-medium text-slate-600">You: {message.prompt}</p>
            <p className="mt-1 text-slate-800">{message.content}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Ask a question to get stage-specific guidance and recommended fixes.
          </p>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {affectedRowsCount > 0 && (
          <p className="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700">{affectedRowsCount} rows affected</p>
        )}
        <textarea
          className="w-full rounded-lg border border-slate-200 p-2 text-sm"
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask AI about this stage..."
        />
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={() => sendPrompt(prompt)}
            disabled={aiLoading}
          >
            {aiLoading ? "Thinking..." : "Ask"}
          </button>
          <button className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700" onClick={onApplyFix}>
            Apply Fix
          </button>
        </div>
      </div>
    </aside>
  );
}

import * as fs from "fs";
import * as vscode from "vscode";
import { LangSmithClient } from "../api/langsmithClient";
import { LangSmithRun, LangSmithTrace } from "../models/types";
import { formatLatency, formatTokens, formatTimestamp } from "../utils/formatting";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeJson(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export class TracePanel {
  private static panel: vscode.WebviewPanel | undefined;
  private static cssText = "";
  private static jsText = "";

  public static async createOrShow(
    context: vscode.ExtensionContext,
    client: LangSmithClient,
    runId: string
  ): Promise<void> {
    if (!TracePanel.panel) {
      TracePanel.panel = vscode.window.createWebviewPanel(
        "langtrace.trace",
        "LangTrace",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      TracePanel.panel.onDidDispose(() => {
        TracePanel.panel = undefined;
      });

      TracePanel.panel.webview.onDidReceiveMessage(() => {
        // Expand/collapse is handled entirely in the webview; messages are informational for now.
      });
    } else {
      TracePanel.panel.reveal(vscode.ViewColumn.Beside);
    }

    const webview = TracePanel.panel.webview;

    // Load assets once per session.
    if (!TracePanel.cssText || !TracePanel.jsText) {
      try {
        TracePanel.cssText = fs.readFileSync(context.asAbsolutePath("media/trace.css"), "utf8");
        TracePanel.jsText = fs.readFileSync(context.asAbsolutePath("media/trace.js"), "utf8");
      } catch {
        // Keep going; webview will still render with inline defaults.
        TracePanel.cssText = "";
        TracePanel.jsText = "";
      }
    }

    try {
      const rootRun = await client.getRun(runId);

      const visited = new Set<string>();
      const buildTree = async (run: LangSmithRun): Promise<LangSmithTrace> => {
        if (visited.has(run.id)) {
          return { root: run, children: [] };
        }
        visited.add(run.id);

        const children = await client.getRunChildren(run.id);
        const childNodes = await Promise.all(children.map(async (child) => buildTree(child)));
        return { root: run, children: childNodes };
      };

      const trace = await buildTree(rootRun);

      TracePanel.panel.title = `LangTrace: ${rootRun.name}`;
      webview.html = TracePanel.getWebviewContent(trace.root, trace.children);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      webview.html = TracePanel.getWebviewContent(
        {
          id: runId,
          name: "Failed to load trace",
          run_type: "trace",
          status: "error",
          start_time: new Date().toISOString(),
          end_time: null,
          latency: null,
          total_tokens: null,
          prompt_tokens: null,
          completion_tokens: null,
          error: message,
          inputs: null,
          outputs: null,
          tags: null,
          project_id: null,
          child_run_ids: null,
          parent_run_id: null,
        } as LangSmithRun,
        []
      );
      TracePanel.panel.title = "LangTrace: Error";
    }
  }

  private static computeTotals(nodes: LangSmithTrace[]): { latencyMs: number; tokens: number } {
    let latencyMs = 0;
    let tokens = 0;

    const walk = (node: LangSmithTrace) => {
      latencyMs += node.root.latency ?? 0;
      const total =
        (node.root.total_tokens ?? null) ??
        ((node.root.prompt_tokens ?? 0) + (node.root.completion_tokens ?? 0));
      tokens += total ?? 0;
      for (const child of node.children) walk(child);
    };

    for (const n of nodes) walk(n);
    return { latencyMs, tokens };
  }

  private static renderStep(node: LangSmithTrace, depth: number): string {
    const latency = node.root.latency ?? 0;
    const tokenCount =
      (node.root.total_tokens ?? null) ??
      ((node.root.prompt_tokens ?? 0) + (node.root.completion_tokens ?? 0));
    const latencyText = formatLatency(latency);
    const tokensText = formatTokens(tokenCount);

    const inputs = safeJson(node.root.inputs);
    const outputs = safeJson(node.root.outputs);

    const errorBlock = node.root.error
      ? `<div class="trace-step-error"><strong>Error:</strong> ${escapeHtml(node.root.error)}</div>`
      : "";

    const childrenHtml = node.children.map((c) => TracePanel.renderStep(c, depth + 1)).join("\n");
    const indentStyle = `margin-left: ${depth * 14}px;`;

    return `
      <div class="trace-step" data-run-id="${escapeHtml(node.root.id)}" style="${indentStyle}">
        <div class="trace-step-header" tabindex="0" role="button" aria-expanded="false">
          <div class="trace-step-left">
            <span class="trace-step-kind">${escapeHtml(node.root.run_type || "step")}</span>
            <span class="trace-step-name">${escapeHtml(node.root.name || "")}</span>
          </div>
          <div class="trace-step-metrics">
            <span class="trace-step-metric">${escapeHtml(latencyText)}</span>
            <span class="trace-step-metric">${escapeHtml(tokensText)} tokens</span>
          </div>
        </div>
        <div class="trace-step-details" aria-hidden="true">
          ${errorBlock}
          <div class="json-block">
            <div class="json-title">Inputs</div>
            <pre class="json-source" data-json-role="inputs">${escapeHtml(inputs)}</pre>
          </div>
          <div class="json-block">
            <div class="json-title">Outputs</div>
            <pre class="json-source" data-json-role="outputs">${escapeHtml(outputs)}</pre>
          </div>
        </div>
        ${childrenHtml ? `<div class="trace-children">${childrenHtml}</div>` : ""}
      </div>
    `;
  }

  // As requested: generate HTML from the root run and its children.
  private static getWebviewContent(run: LangSmithRun, children: LangSmithTrace[]): string {
    const nonce = Math.random().toString(16).slice(2);

    const totalsFromChildren = TracePanel.computeTotals(children);
    const rootLatency = run.latency ?? 0;
    const rootTokens =
      (run.total_tokens ?? null) ?? ((run.prompt_tokens ?? 0) + (run.completion_tokens ?? 0));
    const totalLatency = rootLatency + totalsFromChildren.latencyMs;
    const totalTokens = (rootTokens ?? 0) + totalsFromChildren.tokens;

    const status = typeof run.status === "string" ? run.status : "pending";
    const statusClass = status === "success" ? "status-success" : status === "error" ? "status-error" : "status-pending";

    const headerError = run.error
      ? `<div class="trace-error"><strong>Error:</strong> ${escapeHtml(run.error)}</div>`
      : "";

    const timestamp = run.start_time ? formatTimestamp(run.start_time) : "";
    const latencyText = formatLatency(totalLatency);
    const tokensText = formatTokens(totalTokens);

    const treeHtml = children.map((c) => TracePanel.renderStep(c, 0)).join("\n");

    // If assets fail to load, keep minimal fallback so the UI still works.
    const css = TracePanel.cssText || `
      body { color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family, sans-serif); margin: 12px; }
      .trace-step-header { cursor: pointer; padding: 6px 8px; border: 1px solid rgba(127,127,127,.25); border-radius: 6px; display:flex; justify-content:space-between; gap:12px; }
      .trace-step-details { padding: 8px 10px; border-left: 2px solid rgba(127,127,127,.25); margin-top: 6px; }
      pre.json-source { white-space: pre; overflow:auto; padding: 8px; background: rgba(127,127,127,.08); border-radius: 6px; }
    `;

    const js = TracePanel.jsText || `
      (function(){
        const vscode = acquireVsCodeApi();
        function toggle(header){
          const step = header.closest('.trace-step');
          const details = step.querySelector('.trace-step-details');
          const expanded = details.classList.toggle('expanded');
          header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          details.setAttribute('aria-hidden', expanded ? 'false' : 'true');
          const runId = step.getAttribute('data-run-id');
          vscode.postMessage({ command: 'toggle', runId: runId || null, expanded });
        }
        document.addEventListener('click', (e) => {
          const header = e.target.closest('.trace-step-header');
          if (!header) return;
          toggle(header);
        });
        document.querySelectorAll('.json-source').forEach((pre) => {
          const text = pre.textContent || '';
          pre.textContent = text; // keep plain
        });
      })();
    `;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${css}</style>
  </head>
  <body>
    <div class="trace-header">
      ${headerError}
      <div class="trace-title-row">
        <h2 class="trace-title">${escapeHtml(run.name || "Trace")}</h2>
        <div class="status-badge ${statusClass}">${escapeHtml(status)}</div>
      </div>
      <div class="trace-meta">
        <span class="trace-meta-item"><strong>Latency:</strong> ${escapeHtml(latencyText)}</span>
        <span class="trace-meta-item"><strong>Tokens:</strong> ${escapeHtml(tokensText)}</span>
        <span class="trace-meta-item"><strong>Time:</strong> ${escapeHtml(timestamp)}</span>
      </div>
    </div>

    <div class="trace-tree">
      ${treeHtml || "<div class='trace-empty'>No child runs</div>"}
    </div>

    <script>${js}</script>
  </body>
</html>`;
  }
}


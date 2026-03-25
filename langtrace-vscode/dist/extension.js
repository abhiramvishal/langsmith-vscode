"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));

// src/api/langsmithClient.ts
var LangSmithClient = class {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  async requestJson(path) {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${base}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "accept": "application/json"
      }
    });
    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
      }
      const snippet = body && body.length > 800 ? body.slice(0, 800) + "..." : body;
      throw new Error(
        `LangSmith API request failed (${res.status} ${res.statusText}) for ${url}${snippet ? `: ${snippet}` : ""}`
      );
    }
    return await res.json();
  }
  async getProjects() {
    const data = await this.requestJson("/api/v1/projects");
    const projects = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : Array.isArray(data?.data) ? data.data : void 0;
    if (!projects)
      return [];
    return projects;
  }
  async getRuns(projectId, limit) {
    const q = `session_id=${encodeURIComponent(projectId)}&limit=${encodeURIComponent(String(limit))}&order=desc`;
    const data = await this.requestJson(`/api/v1/runs?${q}`);
    const runs = Array.isArray(data) ? data : Array.isArray(data?.runs) ? data.runs : Array.isArray(data?.data) ? data.data : void 0;
    if (!runs)
      return [];
    return runs;
  }
  async getRun(runId) {
    const data = await this.requestJson(`/api/v1/runs/${encodeURIComponent(runId)}`);
    const run = data?.run ?? data;
    if (!run || typeof run !== "object") {
      throw new Error(`Unexpected LangSmith getRun response shape for runId=${runId}`);
    }
    return run;
  }
  async getRunChildren(runId) {
    const q = `parent_run=true&id=${encodeURIComponent(runId)}`;
    const data = await this.requestJson(`/api/v1/runs?${q}`);
    const runs = Array.isArray(data) ? data : Array.isArray(data?.runs) ? data.runs : Array.isArray(data?.data) ? data.data : void 0;
    if (!runs)
      return [];
    return runs;
  }
  static normalizeStatus(status) {
    if (status === "success" || status === "error" || status === "pending")
      return status;
    if (typeof status === "string") {
      const s = status.toLowerCase();
      if (s.includes("success"))
        return "success";
      if (s.includes("error") || s.includes("fail"))
        return "error";
      if (s.includes("pending") || s.includes("running") || s.includes("in_progress"))
        return "pending";
    }
    return "pending";
  }
};
function createClient(baseUrl, apiKey) {
  return new LangSmithClient(baseUrl, apiKey);
}

// src/auth/secretStorage.ts
var API_KEY_SECRET_NAME = "langtrace.apiKey";
var ApiKeyManager = class {
  constructor(context) {
    this.context = context;
  }
  async getApiKey() {
    const key = await this.context.secrets.get(API_KEY_SECRET_NAME);
    return key ?? void 0;
  }
  async setApiKey(key) {
    await this.context.secrets.store(API_KEY_SECRET_NAME, key);
  }
  async clearApiKey() {
    await this.context.secrets.delete(API_KEY_SECRET_NAME);
  }
  async hasApiKey() {
    const key = await this.getApiKey();
    return !!key;
  }
};

// src/views/projectsProvider.ts
var vscode2 = __toESM(require("vscode"));

// src/utils/formatting.ts
var vscode = __toESM(require("vscode"));
function formatLatency(ms) {
  if (!Number.isFinite(ms))
    return "0ms";
  if (ms < 1e3)
    return `${Math.round(ms)}ms`;
  const s = ms / 1e3;
  const fixed = s.toFixed(1).replace(/\.0$/, "");
  return `${fixed}s`;
}
function formatTokens(count) {
  if (!Number.isFinite(count))
    return "0";
  if (count < 1e3)
    return `${Math.round(count)}`;
  const k = count / 1e3;
  const fixed = k.toFixed(1).replace(/\.0$/, "");
  return `${fixed}k`;
}
function formatTimestamp(iso) {
  if (!iso)
    return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()))
    return iso;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const seconds = Math.round(abs / 1e3);
  const minutes = Math.round(abs / (60 * 1e3));
  const hours = Math.round(abs / (60 * 60 * 1e3));
  const days = Math.round(abs / (24 * 60 * 60 * 1e3));
  const suffix = future ? "from now" : "ago";
  if (abs < 60 * 1e3) {
    return `${seconds}s ${suffix}`;
  }
  if (abs < 60 * 60 * 1e3) {
    return `${minutes} mins ${suffix}`;
  }
  if (abs < 24 * 60 * 60 * 1e3) {
    return `${hours} hours ${suffix}`;
  }
  return new Intl.DateTimeFormat(void 0, { month: "short", day: "numeric" }).format(d);
}
function getStatusIcon(status) {
  switch (status) {
    case "success":
      return "$(check)";
    case "error":
      return "$(error)";
    case "pending":
      return "$(sync~spin)";
    default:
      return "$(circle-large)";
  }
}
function getStatusColor(status) {
  switch (status) {
    case "success":
      return new vscode.ThemeColor("testing.iconPassed");
    case "error":
      return new vscode.ThemeColor("testing.iconFailed");
    case "pending":
      return new vscode.ThemeColor("testing.iconQueued");
    default:
      return new vscode.ThemeColor("foreground");
  }
}

// src/views/projectsProvider.ts
var SetApiKeyItem = class extends vscode2.TreeItem {
  constructor() {
    super("Set API Key");
    this.description = "Configure LangSmith API key to view traces";
    this.command = { command: "langtrace.setApiKey", title: "LangTrace: Set API Key" };
    this.contextValue = "langtrace:setApiKey";
  }
};
var LoadingItem = class extends vscode2.TreeItem {
  constructor() {
    super("Loading...");
    this.contextValue = "langtrace:loading";
  }
};
var ErrorTreeItem = class extends vscode2.TreeItem {
  constructor(message) {
    super("Error loading data");
    this.description = message;
    this.contextValue = "langtrace:error";
  }
};
var ProjectItem = class extends vscode2.TreeItem {
  project;
  constructor(project) {
    super(project.name);
    this.project = project;
    this.collapsibleState = vscode2.TreeItemCollapsibleState.Collapsed;
    this.description = `${project.run_count ?? 0} runs`;
    this.tooltip = `${project.name}

${project.description ?? ""}

ID: ${project.id}`;
    this.contextValue = "langtrace:project";
  }
};
var RunItem = class extends vscode2.TreeItem {
  run;
  constructor(run) {
    const status = LangSmithClient.normalizeStatus(run.status);
    const totalTokens = run.total_tokens ?? null ?? (run.prompt_tokens ?? 0) + (run.completion_tokens ?? 0);
    const latency = run.latency ?? 0;
    super(`${getStatusIcon(status)} ${run.name}`);
    this.run = run;
    this.collapsibleState = vscode2.TreeItemCollapsibleState.None;
    const iconId = status === "success" ? "check" : status === "error" ? "error" : "sync~spin";
    this.iconPath = new vscode2.ThemeIcon(iconId, getStatusColor(status));
    this.description = `${formatLatency(latency)} | ${formatTokens(totalTokens)} tokens`;
    this.tooltip = new vscode2.MarkdownString(
      [
        `**${run.name}**`,
        "",
        `- Type: ${run.run_type}`,
        `- Status: ${status}`,
        `- Started: ${formatTimestamp(run.start_time)}`,
        `- Latency: ${formatLatency(latency)}`,
        `- Tokens: ${formatTokens(totalTokens)}`,
        run.error ? `- Error: ${run.error}` : "",
        "",
        "```json",
        JSON.stringify(
          {
            id: run.id,
            run_type: run.run_type,
            status,
            start_time: run.start_time,
            end_time: run.end_time,
            latency: run.latency,
            total_tokens: run.total_tokens,
            prompt_tokens: run.prompt_tokens,
            completion_tokens: run.completion_tokens,
            error: run.error,
            inputs: run.inputs,
            outputs: run.outputs,
            tags: run.tags,
            project_id: run.project_id,
            child_run_ids: run.child_run_ids,
            parent_run_id: run.parent_run_id
          },
          null,
          2
        ),
        "```"
      ].filter(Boolean).join("\n")
    );
    this.tooltip.isTrusted = true;
    this.command = { command: "langtrace.openTrace", title: "Open Trace", arguments: [run.id] };
    this.contextValue = "langtrace:run";
  }
};
var ProjectsProvider = class {
  constructor(onProjectSelected) {
    this.onProjectSelected = onProjectSelected;
    this.maxRuns = 50;
  }
  client;
  maxRuns;
  projectsCache;
  loadingProjects = false;
  projectsError;
  runsCacheByProjectId = /* @__PURE__ */ new Map();
  projectRunsErrorByProjectId = /* @__PURE__ */ new Map();
  loadingRuns = /* @__PURE__ */ new Set();
  _onDidChangeTreeData = new vscode2.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  setClient(client) {
    this.client = client;
    this.clearCaches();
    this._onDidChangeTreeData.fire(void 0);
  }
  setMaxRuns(limit) {
    this.maxRuns = limit;
    this.clearRunsCaches();
    this._onDidChangeTreeData.fire(void 0);
  }
  refresh() {
    this.clearCaches();
    this._onDidChangeTreeData.fire(void 0);
  }
  clearRunsCaches() {
    this.runsCacheByProjectId.clear();
    this.projectRunsErrorByProjectId.clear();
    this.loadingRuns.clear();
  }
  clearCaches() {
    this.projectsCache = void 0;
    this.projectsError = void 0;
    this.loadingProjects = false;
    this.clearRunsCaches();
  }
  async loadProjects() {
    if (!this.client)
      return;
    try {
      const projects = await this.client.getProjects();
      this.projectsCache = projects;
      this.projectsError = void 0;
    } catch (err) {
      this.projectsError = err instanceof Error ? err.message : String(err);
      this.projectsCache = void 0;
    } finally {
      this.loadingProjects = false;
    }
  }
  async loadRuns(projectId) {
    if (!this.client)
      return;
    try {
      const runs = await this.client.getRuns(projectId, this.maxRuns);
      this.runsCacheByProjectId.set(projectId, runs);
      this.projectRunsErrorByProjectId.delete(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.runsCacheByProjectId.set(projectId, []);
      this.projectRunsErrorByProjectId.set(projectId, message);
    } finally {
      this.loadingRuns.delete(projectId);
    }
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (!this.client) {
      return [new SetApiKeyItem()];
    }
    if (!element) {
      if (this.projectsError)
        return [new ErrorTreeItem(this.projectsError)];
      if (this.projectsCache) {
        return this.projectsCache.map((p) => new ProjectItem(p));
      }
      if (this.loadingProjects)
        return [new LoadingItem()];
      this.loadingProjects = true;
      void this.loadProjects().finally(() => this._onDidChangeTreeData.fire(void 0));
      return [new LoadingItem()];
    }
    if (!(element instanceof ProjectItem))
      return [];
    const projectId = element.project.id;
    this.onProjectSelected(element.project);
    const error = this.projectRunsErrorByProjectId.get(projectId);
    if (error)
      return [new ErrorTreeItem(error)];
    const cached = this.runsCacheByProjectId.get(projectId);
    if (cached)
      return cached.map((r) => new RunItem(r));
    if (this.loadingRuns.has(projectId))
      return [new LoadingItem()];
    this.loadingRuns.add(projectId);
    void this.loadRuns(projectId).finally(() => this._onDidChangeTreeData.fire(element));
    return [new LoadingItem()];
  }
};

// src/views/runsProvider.ts
var vscode3 = __toESM(require("vscode"));
var SetApiKeyItem2 = class extends vscode3.TreeItem {
  constructor() {
    super("Set API Key");
    this.description = "Configure LangSmith API key to view runs";
    this.command = { command: "langtrace.setApiKey", title: "LangTrace: Set API Key" };
    this.contextValue = "langtrace:setApiKey";
  }
};
var LoadingItem2 = class extends vscode3.TreeItem {
  constructor() {
    super("Loading...");
    this.contextValue = "langtrace:loading";
  }
};
var ErrorTreeItem2 = class extends vscode3.TreeItem {
  constructor(message) {
    super("Error loading runs");
    this.description = message;
    this.contextValue = "langtrace:error";
  }
};
var NoProjectItem = class extends vscode3.TreeItem {
  constructor() {
    super("Select a project");
    this.description = "Open a project in the Projects view to see its runs here";
    this.contextValue = "langtrace:noProject";
  }
};
var RunItem2 = class extends vscode3.TreeItem {
  run;
  constructor(run) {
    const status = LangSmithClient.normalizeStatus(run.status);
    const totalTokens = run.total_tokens ?? null ?? (run.prompt_tokens ?? 0) + (run.completion_tokens ?? 0);
    const latency = run.latency ?? 0;
    super(`${getStatusIcon(status)} ${run.name}`);
    this.run = run;
    this.collapsibleState = vscode3.TreeItemCollapsibleState.None;
    const iconId = status === "success" ? "check" : status === "error" ? "error" : "sync~spin";
    this.iconPath = new vscode3.ThemeIcon(iconId, getStatusColor(status));
    this.description = `${formatLatency(latency)} | ${formatTokens(totalTokens)} tokens`;
    this.tooltip = new vscode3.MarkdownString(
      [
        `**${run.name}**`,
        "",
        `- Type: ${run.run_type}`,
        `- Status: ${status}`,
        `- Started: ${formatTimestamp(run.start_time)}`,
        `- Latency: ${formatLatency(latency)}`,
        `- Tokens: ${formatTokens(totalTokens)}`,
        run.error ? `- Error: ${run.error}` : "",
        "",
        "```json",
        JSON.stringify(
          {
            id: run.id,
            run_type: run.run_type,
            status,
            start_time: run.start_time,
            end_time: run.end_time,
            latency: run.latency,
            total_tokens: run.total_tokens,
            prompt_tokens: run.prompt_tokens,
            completion_tokens: run.completion_tokens,
            error: run.error,
            inputs: run.inputs,
            outputs: run.outputs,
            tags: run.tags,
            project_id: run.project_id,
            child_run_ids: run.child_run_ids,
            parent_run_id: run.parent_run_id
          },
          null,
          2
        ),
        "```"
      ].filter(Boolean).join("\n")
    );
    this.tooltip.isTrusted = true;
    this.command = { command: "langtrace.openTrace", title: "Open Trace", arguments: [run.id] };
    this.contextValue = "langtrace:run";
  }
};
var RunsProvider = class {
  client;
  maxRuns;
  currentProject;
  runsCache;
  loadingRuns = false;
  runsError;
  _onDidChangeTreeData = new vscode3.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor() {
    this.maxRuns = 50;
  }
  setClient(client) {
    this.client = client;
    this.runsCache = void 0;
    this.runsError = void 0;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(void 0);
  }
  setMaxRuns(limit) {
    this.maxRuns = limit;
    this.runsCache = void 0;
    this.runsError = void 0;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(void 0);
  }
  setProject(project) {
    this.currentProject = project;
    this.runsCache = void 0;
    this.runsError = void 0;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(void 0);
  }
  refresh() {
    if (!this.currentProject)
      return;
    this.runsCache = void 0;
    this.runsError = void 0;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(void 0);
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    if (!this.client)
      return [new SetApiKeyItem2()];
    if (!this.currentProject)
      return [new NoProjectItem()];
    if (this.runsError)
      return [new ErrorTreeItem2(this.runsError)];
    if (this.runsCache)
      return this.runsCache.map((r) => new RunItem2(r));
    if (this.loadingRuns)
      return [new LoadingItem2()];
    this.loadingRuns = true;
    void this.loadRuns(this.currentProject.id).finally(() => this._onDidChangeTreeData.fire(void 0));
    return [new LoadingItem2()];
  }
  async loadRuns(projectId) {
    if (!this.client)
      return;
    try {
      const runs = await this.client.getRuns(projectId, this.maxRuns);
      this.runsCache = runs;
      this.runsError = void 0;
    } catch (err) {
      this.runsCache = [];
      this.runsError = err instanceof Error ? err.message : String(err);
    } finally {
      this.loadingRuns = false;
    }
  }
};

// src/views/tracePanel.ts
var fs = __toESM(require("fs"));
var vscode4 = __toESM(require("vscode"));
function escapeHtml(input) {
  return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function safeJson(value) {
  try {
    if (typeof value === "string")
      return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
var TracePanel = class _TracePanel {
  static panel;
  static cssText = "";
  static jsText = "";
  static async createOrShow(context, client, runId) {
    if (!_TracePanel.panel) {
      _TracePanel.panel = vscode4.window.createWebviewPanel(
        "langtrace.trace",
        "LangTrace",
        vscode4.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      _TracePanel.panel.onDidDispose(() => {
        _TracePanel.panel = void 0;
      });
      _TracePanel.panel.webview.onDidReceiveMessage(() => {
      });
    } else {
      _TracePanel.panel.reveal(vscode4.ViewColumn.Beside);
    }
    const webview = _TracePanel.panel.webview;
    if (!_TracePanel.cssText || !_TracePanel.jsText) {
      try {
        _TracePanel.cssText = fs.readFileSync(context.asAbsolutePath("media/trace.css"), "utf8");
        _TracePanel.jsText = fs.readFileSync(context.asAbsolutePath("media/trace.js"), "utf8");
      } catch {
        _TracePanel.cssText = "";
        _TracePanel.jsText = "";
      }
    }
    try {
      const rootRun = await client.getRun(runId);
      const visited = /* @__PURE__ */ new Set();
      const buildTree = async (run) => {
        if (visited.has(run.id)) {
          return { root: run, children: [] };
        }
        visited.add(run.id);
        const children = await client.getRunChildren(run.id);
        const childNodes = await Promise.all(children.map(async (child) => buildTree(child)));
        return { root: run, children: childNodes };
      };
      const trace = await buildTree(rootRun);
      _TracePanel.panel.title = `LangTrace: ${rootRun.name}`;
      webview.html = _TracePanel.getWebviewContent(trace.root, trace.children);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      webview.html = _TracePanel.getWebviewContent(
        {
          id: runId,
          name: "Failed to load trace",
          run_type: "trace",
          status: "error",
          start_time: (/* @__PURE__ */ new Date()).toISOString(),
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
          parent_run_id: null
        },
        []
      );
      _TracePanel.panel.title = "LangTrace: Error";
    }
  }
  static computeTotals(nodes) {
    let latencyMs = 0;
    let tokens = 0;
    const walk = (node) => {
      latencyMs += node.root.latency ?? 0;
      const total = node.root.total_tokens ?? null ?? (node.root.prompt_tokens ?? 0) + (node.root.completion_tokens ?? 0);
      tokens += total ?? 0;
      for (const child of node.children)
        walk(child);
    };
    for (const n of nodes)
      walk(n);
    return { latencyMs, tokens };
  }
  static renderStep(node, depth) {
    const latency = node.root.latency ?? 0;
    const tokenCount = node.root.total_tokens ?? null ?? (node.root.prompt_tokens ?? 0) + (node.root.completion_tokens ?? 0);
    const latencyText = formatLatency(latency);
    const tokensText = formatTokens(tokenCount);
    const inputs = safeJson(node.root.inputs);
    const outputs = safeJson(node.root.outputs);
    const errorBlock = node.root.error ? `<div class="trace-step-error"><strong>Error:</strong> ${escapeHtml(node.root.error)}</div>` : "";
    const childrenHtml = node.children.map((c) => _TracePanel.renderStep(c, depth + 1)).join("\n");
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
  static getWebviewContent(run, children) {
    const nonce = Math.random().toString(16).slice(2);
    const totalsFromChildren = _TracePanel.computeTotals(children);
    const rootLatency = run.latency ?? 0;
    const rootTokens = run.total_tokens ?? null ?? (run.prompt_tokens ?? 0) + (run.completion_tokens ?? 0);
    const totalLatency = rootLatency + totalsFromChildren.latencyMs;
    const totalTokens = (rootTokens ?? 0) + totalsFromChildren.tokens;
    const status = typeof run.status === "string" ? run.status : "pending";
    const statusClass = status === "success" ? "status-success" : status === "error" ? "status-error" : "status-pending";
    const headerError = run.error ? `<div class="trace-error"><strong>Error:</strong> ${escapeHtml(run.error)}</div>` : "";
    const timestamp = run.start_time ? formatTimestamp(run.start_time) : "";
    const latencyText = formatLatency(totalLatency);
    const tokensText = formatTokens(totalTokens);
    const treeHtml = children.map((c) => _TracePanel.renderStep(c, 0)).join("\n");
    const css = _TracePanel.cssText || `
      body { color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family, sans-serif); margin: 12px; }
      .trace-step-header { cursor: pointer; padding: 6px 8px; border: 1px solid rgba(127,127,127,.25); border-radius: 6px; display:flex; justify-content:space-between; gap:12px; }
      .trace-step-details { padding: 8px 10px; border-left: 2px solid rgba(127,127,127,.25); margin-top: 6px; }
      pre.json-source { white-space: pre; overflow:auto; padding: 8px; background: rgba(127,127,127,.08); border-radius: 6px; }
    `;
    const js = _TracePanel.jsText || `
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
};

// src/extension.ts
var pollingHandle;
function getLangtraceConfig() {
  return vscode5.workspace.getConfiguration("langtrace");
}
async function activate(context) {
  const apiKeyManager = new ApiKeyManager(context);
  const runsProvider = new RunsProvider();
  const projectsProvider = new ProjectsProvider((project) => {
    runsProvider.setProject(project);
  });
  let client;
  const statusBar = vscode5.window.createStatusBarItem(vscode5.StatusBarAlignment.Left, 100);
  statusBar.text = "LangTrace: No API Key";
  statusBar.show();
  const syncSettings = () => {
    const config2 = getLangtraceConfig();
    const maxRuns = config2.get("maxRuns", 50);
    projectsProvider.setMaxRuns(maxRuns);
    runsProvider.setMaxRuns(maxRuns);
  };
  const setConnected = (connected) => {
    statusBar.text = connected ? "LangTrace: Connected" : "LangTrace: No API Key";
  };
  const setClientFromStoredKey = async () => {
    const config2 = getLangtraceConfig();
    const baseUrl = config2.get("baseUrl", "https://api.smith.langchain.com");
    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      client = void 0;
      projectsProvider.setClient(void 0);
      runsProvider.setClient(void 0);
      setConnected(false);
      return;
    }
    client = createClient(baseUrl, apiKey);
    projectsProvider.setClient(client);
    runsProvider.setClient(client);
    syncSettings();
    setConnected(true);
  };
  const projectsView = vscode5.window.createTreeView("langtrace.projects", {
    treeDataProvider: projectsProvider
  });
  const runsView = vscode5.window.createTreeView("langtrace.runs", {
    treeDataProvider: runsProvider
  });
  context.subscriptions.push(projectsView, runsView, statusBar);
  const disposableSetApiKey = vscode5.commands.registerCommand("langtrace.setApiKey", async () => {
    const value = await vscode5.window.showInputBox({
      prompt: "Paste your LangSmith API key (starts with ls__)",
      placeHolder: "ls__...",
      ignoreFocusOut: true,
      password: true
    });
    if (!value)
      return;
    if (!value.startsWith("ls__")) {
      vscode5.window.showErrorMessage("Invalid LangSmith API key. Expected it to start with 'ls__'.");
      return;
    }
    await apiKeyManager.setApiKey(value.trim());
    await setClientFromStoredKey();
    vscode5.window.showInformationMessage("LangTrace: API key saved.");
  });
  const disposableClearApiKey = vscode5.commands.registerCommand("langtrace.clearApiKey", async () => {
    const ok = await vscode5.window.showWarningMessage(
      "Clear the stored LangSmith API key for LangTrace?",
      { modal: true },
      "Clear"
    );
    if (ok !== "Clear")
      return;
    await apiKeyManager.clearApiKey();
    await setClientFromStoredKey();
    vscode5.window.showInformationMessage("LangTrace: API key cleared.");
  });
  const disposableRefresh = vscode5.commands.registerCommand("langtrace.refresh", async () => {
    syncSettings();
    projectsProvider.refresh();
    runsProvider.refresh();
    vscode5.window.showInformationMessage("LangTrace refreshed.");
  });
  const disposableOpenInBrowser = vscode5.commands.registerCommand("langtrace.openInBrowser", async () => {
    vscode5.env.openExternal(vscode5.Uri.parse("https://smith.langchain.com"));
  });
  const disposableOpenTrace = vscode5.commands.registerCommand(
    "langtrace.openTrace",
    async (runId) => {
      if (!client) {
        vscode5.window.showErrorMessage("LangTrace: No API key configured. Use 'LangTrace: Set API Key'.");
        return;
      }
      if (!runId)
        return;
      await TracePanel.createOrShow(context, client, runId);
    }
  );
  context.subscriptions.push(
    disposableSetApiKey,
    disposableClearApiKey,
    disposableRefresh,
    disposableOpenInBrowser,
    disposableOpenTrace
  );
  await setClientFromStoredKey();
  const config = getLangtraceConfig();
  const pollIntervalSecs = config.get("pollInterval", 30);
  if (pollIntervalSecs > 0) {
    pollingHandle = setInterval(() => {
      if (!client)
        return;
      syncSettings();
      projectsProvider.refresh();
      runsProvider.refresh();
    }, pollIntervalSecs * 1e3);
    context.subscriptions.push({
      dispose: () => {
        if (pollingHandle)
          clearInterval(pollingHandle);
        pollingHandle = void 0;
      }
    });
  }
}
function deactivate() {
  if (pollingHandle)
    clearInterval(pollingHandle);
  pollingHandle = void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map

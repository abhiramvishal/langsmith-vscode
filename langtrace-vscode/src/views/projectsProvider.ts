import * as vscode from "vscode";
import { LangSmithClient } from "../api/langsmithClient";
import { LangSmithProject, LangSmithRun, RunStatus } from "../models/types";
import { formatLatency, formatTokens, formatTimestamp, getStatusColor } from "../utils/formatting";

class SetApiKeyItem extends vscode.TreeItem {
  constructor() {
    super("Set API Key");
    this.description = "Configure LangSmith API key to view traces";
    this.command = { command: "langtrace.setApiKey", title: "LangTrace: Set API Key" };
    this.contextValue = "langtrace:setApiKey";
  }
}

class LoadingItem extends vscode.TreeItem {
  constructor() {
    super("Loading...");
    this.contextValue = "langtrace:loading";
  }
}

class ErrorTreeItem extends vscode.TreeItem {
  constructor(message: string) {
    super("Error loading data");
    this.description = message;
    this.contextValue = "langtrace:error";
  }
}

class LoadMoreItem extends vscode.TreeItem {
  constructor(projectId: string) {
    super("$(chevron-down) Load more...");
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.contextValue = "loadMore";
    this.command = { command: "langtrace.loadMoreProjectRuns", title: "Load more runs", arguments: [projectId] };
  }
}

export class ProjectItem extends vscode.TreeItem {
  public readonly project: LangSmithProject;

  constructor(project: LangSmithProject) {
    super(project.name);
    this.project = project;
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

    const parts: string[] = [];
    if (project.run_count != null) parts.push(`${project.run_count} runs`);
    if (project.latency_p50 != null) parts.push(formatLatency(project.latency_p50 * 1000));
    if (project.error_rate != null) parts.push(`${(project.error_rate * 100).toFixed(1)}% err`);
    this.description = parts.join(" · ");

    const errorRate = project.error_rate ?? 0;
    this.iconPath = new vscode.ThemeIcon(
      errorRate > 0.1 ? "warning" : "folder",
      errorRate > 0.1 ? new vscode.ThemeColor("testing.iconFailed") : undefined
    );

    const lines = [
      `**${project.name}**`,
      project.description ?? "",
      "",
      `- Runs: ${project.run_count ?? "—"}`,
      project.latency_p50 != null ? `- Latency p50: ${formatLatency(project.latency_p50 * 1000)}` : "",
      project.latency_p99 != null ? `- Latency p99: ${formatLatency(project.latency_p99 * 1000)}` : "",
      project.error_rate != null ? `- Error rate: ${(project.error_rate * 100).toFixed(1)}%` : "",
      project.total_tokens != null ? `- Total tokens: ${formatTokens(project.total_tokens)}` : "",
      `- ID: \`${project.id}\``,
    ].filter(Boolean);
    this.tooltip = new vscode.MarkdownString(lines.join("\n"));
    this.contextValue = "langtrace:project";
  }
}

function runTypeIcon(runType: string): string {
  switch (runType) {
    case "llm": return "hubot";
    case "chain": return "type-hierarchy";
    case "tool": return "tools";
    case "retriever": return "search";
    case "embedding": return "symbol-array";
    default: return "circle-small";
  }
}

class RunItem extends vscode.TreeItem {
  public readonly run: LangSmithRun;

  constructor(run: LangSmithRun) {
    const status = LangSmithClient.normalizeStatus(run.status) as RunStatus;
    const totalTokens =
      (run.total_tokens ?? null) ??
      ((run.prompt_tokens ?? 0) + (run.completion_tokens ?? 0));
    const latency = run.latency ?? 0;

    super(run.name);
    this.run = run;
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    this.iconPath = new vscode.ThemeIcon(runTypeIcon(run.run_type), getStatusColor(status));

    const tokenParts: string[] = [];
    if (run.prompt_tokens != null) tokenParts.push(`↑${formatTokens(run.prompt_tokens)}`);
    if (run.completion_tokens != null) tokenParts.push(`↓${formatTokens(run.completion_tokens)}`);
    const tokenText = tokenParts.length ? tokenParts.join(" ") : `${formatTokens(totalTokens)}`;
    this.description = `${run.run_type} · ${formatLatency(latency)} · ${tokenText}`;

    const tooltipLines = [
      `**${run.name}**`,
      "",
      `- Type: \`${run.run_type}\``,
      `- Status: ${status}`,
      `- Started: ${formatTimestamp(run.start_time)}`,
      `- Latency: ${formatLatency(latency)}`,
      run.prompt_tokens != null ? `- Prompt tokens: ${run.prompt_tokens}` : "",
      run.completion_tokens != null ? `- Completion tokens: ${run.completion_tokens}` : "",
      `- Total tokens: ${formatTokens(totalTokens)}`,
      run.error ? `\n**Error:** ${run.error}` : "",
      run.tags?.length ? `- Tags: ${run.tags.join(", ")}` : "",
    ].filter(Boolean);
    this.tooltip = new vscode.MarkdownString(tooltipLines.join("\n"));
    this.tooltip.isTrusted = true;

    this.command = { command: "langtrace.openTrace", title: "Open Trace", arguments: [run.id] };
    this.contextValue = "runItem";
  }
}

export class ProjectsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private client?: LangSmithClient;
  private maxRuns: number;

  private projectsCache: LangSmithProject[] | undefined;
  private loadingProjects = false;
  private projectsError: string | undefined;

  private runsCacheByProjectId = new Map<string, LangSmithRun[]>();
  private projectRunsErrorByProjectId = new Map<string, string>();
  private loadingRuns = new Set<string>();

  private currentLimitByProjectId = new Map<string, number>();
  private lastSelectedProjectId: string | undefined;

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly onProjectSelected: (project: LangSmithProject) => void
  ) {
    this.maxRuns = 50;
  }

  public setClient(client: LangSmithClient | undefined) {
    this.client = client;
    this.clearCaches();
    this._onDidChangeTreeData.fire(undefined);
  }

  public setMaxRuns(limit: number) {
    this.maxRuns = limit;
    this.currentLimitByProjectId.clear();
    this.clearRunsCaches();
    this._onDidChangeTreeData.fire(undefined);
  }

  public refresh() {
    // Keep the per-project currentLimit so "Load more" remains meaningful across polling.
    this.projectsCache = undefined;
    this.projectsError = undefined;
    this.loadingProjects = false;
    this.clearRunsCaches();
    this._onDidChangeTreeData.fire(undefined);
  }

  private clearRunsCaches() {
    this.runsCacheByProjectId.clear();
    this.projectRunsErrorByProjectId.clear();
    this.loadingRuns.clear();
  }

  private clearCaches() {
    this.projectsCache = undefined;
    this.projectsError = undefined;
    this.loadingProjects = false;
    this.currentLimitByProjectId.clear();
    this.lastSelectedProjectId = undefined;
    this.clearRunsCaches();
  }

  private async loadProjects(): Promise<void> {
    if (!this.client) return;
    try {
      const projects = await this.client.getProjects();
      this.projectsCache = projects;
      this.projectsError = undefined;
    } catch (err) {
      this.projectsError = err instanceof Error ? err.message : String(err);
      this.projectsCache = undefined;
    } finally {
      this.loadingProjects = false;
    }
  }

  private async loadRuns(projectId: string, limit: number): Promise<void> {
    if (!this.client) return;
    try {
      const runs = await this.client.getRuns(projectId, limit);
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

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!this.client) {
      return [new SetApiKeyItem()];
    }

    if (!element) {
      if (this.projectsError) return [new ErrorTreeItem(this.projectsError)];
      if (this.projectsCache) {
        return this.projectsCache.map((p) => new ProjectItem(p));
      }
      if (this.loadingProjects) return [new LoadingItem()];

      this.loadingProjects = true;
      void this.loadProjects().finally(() => this._onDidChangeTreeData.fire(undefined));
      return [new LoadingItem()];
    }

    // Inline children for runs.
    if (!(element instanceof ProjectItem)) return [];
    const projectId = element.project.id;
    const currentLimit =
      this.currentLimitByProjectId.get(projectId) ?? this.maxRuns;
    if (!this.currentLimitByProjectId.has(projectId)) {
      this.currentLimitByProjectId.set(projectId, currentLimit);
    }

    // Avoid resetting the standalone Runs panel on "Load more..." re-renders.
    if (this.lastSelectedProjectId !== projectId) {
      this.lastSelectedProjectId = projectId;
      this.onProjectSelected(element.project);
    }

    const error = this.projectRunsErrorByProjectId.get(projectId);
    if (error) return [new ErrorTreeItem(error)];

    const cached = this.runsCacheByProjectId.get(projectId);
    if (cached) {
      const items: vscode.TreeItem[] = cached.map((r) => new RunItem(r));
      if (cached.length === currentLimit) items.push(new LoadMoreItem(projectId));
      return items;
    }

    if (this.loadingRuns.has(projectId)) return [new LoadingItem()];

    this.loadingRuns.add(projectId);
    void this.loadRuns(projectId, currentLimit).finally(() => this._onDidChangeTreeData.fire(element));
    return [new LoadingItem()];
  }

  public async loadMore(projectId: string): Promise<void> {
    if (!this.client) return;

    const currentLimit = this.currentLimitByProjectId.get(projectId) ?? this.maxRuns;
    const nextLimit = currentLimit * 2;

    this.currentLimitByProjectId.set(projectId, nextLimit);
    this.runsCacheByProjectId.delete(projectId);
    this.projectRunsErrorByProjectId.delete(projectId);

    if (this.loadingRuns.has(projectId)) return;
    this.loadingRuns.add(projectId);
    await this.loadRuns(projectId, nextLimit);
    this._onDidChangeTreeData.fire(undefined);
  }
}


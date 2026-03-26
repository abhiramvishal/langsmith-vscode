import * as vscode from "vscode";
import { LangSmithClient } from "../api/langsmithClient";
import { LangSmithProject, LangSmithRun, RunStatus } from "../models/types";
import { defaultFilter, RunFilter } from "../models/filterState";
import { formatLatency, formatTokens, formatTimestamp, getStatusColor } from "../utils/formatting";

class SetApiKeyItem extends vscode.TreeItem {
  constructor() {
    super("Set API Key");
    this.description = "Configure LangSmith API key to view runs";
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
    super("Error loading runs");
    this.description = message;
    this.contextValue = "langtrace:error";
  }
}

class NoProjectItem extends vscode.TreeItem {
  constructor() {
    super("Select a project");
    this.description = "Open a project in the Projects view to see its runs here";
    this.contextValue = "langtrace:noProject";
  }
}

class FilterInfoItem extends vscode.TreeItem {
  constructor(text: string) {
    super(`$(filter-filled) ${text}`);
    this.contextValue = "filterInfo";
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.tooltip = text;
  }
}

class LoadMoreItem extends vscode.TreeItem {
  constructor() {
    super("$(chevron-down) Load more...");
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.contextValue = "loadMore";
    this.command = { command: "langtrace.loadMoreRunsPanel", title: "Load more runs" };
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

export class RunItem extends vscode.TreeItem {
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

    // Type icon with status color overlay.
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

export class RunsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private client?: LangSmithClient;
  private maxRuns: number;

  private currentProject?: LangSmithProject;
  private currentLimit: number;

  private filter: RunFilter = defaultFilter;

  private runsCache: LangSmithRun[] | undefined;
  private loadingRuns = false;
  private runsError: string | undefined;

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    this.maxRuns = 50;
    this.currentLimit = 50;
  }

  public setClient(client: LangSmithClient | undefined) {
    this.client = client;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    this.currentLimit = this.maxRuns;
    this._onDidChangeTreeData.fire(undefined);
  }

  public setMaxRuns(limit: number) {
    this.maxRuns = limit;
    if (this.currentProject) this.currentLimit = limit;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  public setProject(project: LangSmithProject) {
    this.currentProject = project;
    this.currentLimit = this.maxRuns;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  public refresh() {
    if (!this.currentProject) return;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    // Keep currentLimit so "Load more" grows across polling.
    this._onDidChangeTreeData.fire(undefined);
  }

  public setFilter(filter: RunFilter): void {
    this.filter = filter;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  private isAnyFilterActive(filter: RunFilter): boolean {
    return (
      filter.status !== "all" ||
      filter.search.trim().length > 0 ||
      filter.startDate !== null ||
      filter.endDate !== null
    );
  }

  private getFilterInfoText(filter: RunFilter): string {
    const parts: string[] = [];
    if (filter.status !== "all") parts.push(`status=${filter.status}`);
    if (filter.search.trim().length > 0) parts.push(`search=${filter.search.trim()}`);
    if (filter.startDate) parts.push(`startDate=${filter.startDate}`);
    if (filter.endDate) parts.push(`endDate=${filter.endDate}`);
    return parts.length > 0 ? `Filtered: ${parts.join(", ")}` : "Filtered";
  }

  private applyFilter(runs: LangSmithRun[]): LangSmithRun[] {
    const status = this.filter.status;
    const search = this.filter.search.trim().toLowerCase();

    const startMsRaw = this.filter.startDate ? new Date(this.filter.startDate).getTime() : null;
    const endMsRaw = this.filter.endDate ? new Date(this.filter.endDate).getTime() : null;
    const startMs = startMsRaw !== null && Number.isFinite(startMsRaw) ? startMsRaw : null;
    const endMs = endMsRaw !== null && Number.isFinite(endMsRaw) ? endMsRaw : null;

    return runs.filter((run) => {
      if (status !== "all") {
        const normalized = LangSmithClient.normalizeStatus(run.status);
        if (normalized !== status) return false;
      }

      if (search) {
        const name = (run.name ?? "").toLowerCase();
        if (!name.includes(search)) return false;
      }

      if (startMs !== null) {
        const runMs = run.start_time ? new Date(run.start_time).getTime() : NaN;
        if (!Number.isFinite(runMs) || runMs < startMs) return false;
      }

      if (endMs !== null) {
        const runMs = run.start_time ? new Date(run.start_time).getTime() : NaN;
        if (!Number.isFinite(runMs) || runMs > endMs) return false;
      }

      return true;
    });
  }

  public getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!this.client) return [new SetApiKeyItem()];
    if (!this.currentProject) return [new NoProjectItem()];

    if (this.runsError) return [new ErrorTreeItem(this.runsError)];
    if (this.runsCache) {
      const filtered = this.applyFilter(this.runsCache);
      const items: vscode.TreeItem[] = [];
      if (this.isAnyFilterActive(this.filter)) {
        items.push(new FilterInfoItem(this.getFilterInfoText(this.filter)));
      }
      items.push(...filtered.map((r) => new RunItem(r)));
      if (this.runsCache.length === this.currentLimit) items.push(new LoadMoreItem());
      return items;
    }
    if (this.loadingRuns) return [new LoadingItem()];

    this.loadingRuns = true;
    void this.loadRuns(this.currentProject.id, this.currentLimit).finally(() => this._onDidChangeTreeData.fire(undefined));
    return [new LoadingItem()];
  }

  private async loadRuns(projectId: string, limit: number): Promise<void> {
    if (!this.client) return;
    try {
      const runs = await this.client.getRuns(projectId, limit);
      this.runsCache = runs;
      this.runsError = undefined;
    } catch (err) {
      this.runsCache = [];
      this.runsError = err instanceof Error ? err.message : String(err);
    } finally {
      this.loadingRuns = false;
    }
  }

  public async loadMore(): Promise<void> {
    if (!this.client) return;
    if (!this.currentProject) return;

    const nextLimit = this.currentLimit * 2;
    this.currentLimit = nextLimit;
    this.runsCache = undefined;
    this.runsError = undefined;

    if (this.loadingRuns) return;
    this.loadingRuns = true;
    await this.loadRuns(this.currentProject.id, this.currentLimit);
    this._onDidChangeTreeData.fire(undefined);
  }
}


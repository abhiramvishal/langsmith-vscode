import * as vscode from "vscode";
import { LangSmithClient } from "../api/langsmithClient";
import { LangSmithProject, LangSmithRun, RunStatus } from "../models/types";
import { formatLatency, formatTokens, formatTimestamp, getStatusColor, getStatusIcon } from "../utils/formatting";

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
    this.description = `${project.run_count ?? 0} runs`;
    this.tooltip = `${project.name}\n\n${project.description ?? ""}\n\nID: ${project.id}`;
    this.contextValue = "langtrace:project";
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

    super(`${getStatusIcon(status)} ${run.name}`);
    this.run = run;
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    const iconId = status === "success" ? "check" : status === "error" ? "error" : "sync~spin";
    this.iconPath = new vscode.ThemeIcon(iconId, getStatusColor(status));

    this.description = `${formatLatency(latency)} | ${formatTokens(totalTokens)} tokens`;
    this.tooltip = new vscode.MarkdownString(
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
            parent_run_id: run.parent_run_id,
          },
          null,
          2
        ),
        "```",
      ]
        .filter(Boolean)
        .join("\n")
    );
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


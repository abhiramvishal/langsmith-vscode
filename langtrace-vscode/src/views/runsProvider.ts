import * as vscode from "vscode";
import { LangSmithClient } from "../api/langsmithClient";
import { LangSmithProject, LangSmithRun, RunStatus } from "../models/types";
import { formatLatency, formatTokens, formatTimestamp, getStatusColor, getStatusIcon } from "../utils/formatting";

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

export class RunItem extends vscode.TreeItem {
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
    this.contextValue = "langtrace:run";
  }
}

export class RunsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private client?: LangSmithClient;
  private maxRuns: number;

  private currentProject?: LangSmithProject;

  private runsCache: LangSmithRun[] | undefined;
  private loadingRuns = false;
  private runsError: string | undefined;

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    this.maxRuns = 50;
  }

  public setClient(client: LangSmithClient | undefined) {
    this.client = client;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  public setMaxRuns(limit: number) {
    this.maxRuns = limit;
    this.runsCache = undefined;
    this.runsError = undefined;
    this.loadingRuns = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  public setProject(project: LangSmithProject) {
    this.currentProject = project;
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
    this._onDidChangeTreeData.fire(undefined);
  }

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!this.client) return [new SetApiKeyItem()];
    if (!this.currentProject) return [new NoProjectItem()];

    if (this.runsError) return [new ErrorTreeItem(this.runsError)];
    if (this.runsCache) return this.runsCache.map((r) => new RunItem(r));
    if (this.loadingRuns) return [new LoadingItem()];

    this.loadingRuns = true;
    void this.loadRuns(this.currentProject.id).finally(() => this._onDidChangeTreeData.fire(undefined));
    return [new LoadingItem()];
  }

  private async loadRuns(projectId: string): Promise<void> {
    if (!this.client) return;
    try {
      const runs = await this.client.getRuns(projectId, this.maxRuns);
      this.runsCache = runs;
      this.runsError = undefined;
    } catch (err) {
      this.runsCache = [];
      this.runsError = err instanceof Error ? err.message : String(err);
    } finally {
      this.loadingRuns = false;
    }
  }
}


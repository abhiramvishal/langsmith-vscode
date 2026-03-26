import * as vscode from "vscode";
import { LangSmithClient } from "../api/langsmithClient";
import { LangSmithDataset } from "../models/types";

class SetApiKeyItem extends vscode.TreeItem {
  constructor() {
    super("Set API Key");
    this.description = "Configure LangSmith API key to view datasets";
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
    super("Error loading datasets");
    this.description = message;
    this.contextValue = "langtrace:error";
  }
}

class DatasetItem extends vscode.TreeItem {
  constructor(dataset: LangSmithDataset) {
    super(dataset.name);
    const parts: string[] = [`${dataset.example_count ?? 0} examples`];
    if (dataset.data_type) parts.push(dataset.data_type);
    this.description = parts.join(" · ");
    this.iconPath = new vscode.ThemeIcon("database");
    const tooltipLines = [
      `**${dataset.name}**`,
      dataset.description ?? "",
      "",
      `- Examples: ${dataset.example_count ?? "—"}`,
      dataset.data_type ? `- Type: \`${dataset.data_type}\`` : "",
      `- Created: ${dataset.created_at ? new Date(dataset.created_at).toLocaleDateString() : "—"}`,
      `- Modified: ${dataset.modified_at ? new Date(dataset.modified_at).toLocaleDateString() : "—"}`,
      `- ID: \`${dataset.id}\``,
    ].filter(Boolean);
    this.tooltip = new vscode.MarkdownString(tooltipLines.join("\n"));
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.contextValue = "langtrace:dataset";
  }
}

export class DatasetsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private client?: LangSmithClient;
  private maxDatasets: number;

  private datasetsCache: LangSmithDataset[] | undefined;
  private loadingDatasets = false;
  private datasetsError: string | undefined;

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    this.maxDatasets = 50;
  }

  public setClient(client: LangSmithClient | undefined) {
    this.client = client;
    this.clearCaches();
    this._onDidChangeTreeData.fire(undefined);
  }

  public setMaxRuns(limit: number) {
    // Reuse langtrace.maxRuns as a dataset limit for now.
    this.maxDatasets = limit;
    this.clearCaches();
    this._onDidChangeTreeData.fire(undefined);
  }

  public refresh() {
    this.clearCaches();
    this._onDidChangeTreeData.fire(undefined);
  }

  private clearCaches() {
    this.datasetsCache = undefined;
    this.datasetsError = undefined;
    this.loadingDatasets = false;
  }

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!this.client) return [new SetApiKeyItem()];
    if (element) return [];

    if (this.datasetsError) return [new ErrorTreeItem(this.datasetsError)];
    if (this.datasetsCache) return this.datasetsCache.map((d) => new DatasetItem(d));
    if (this.loadingDatasets) return [new LoadingItem()];

    this.loadingDatasets = true;
    void this.loadDatasets().finally(() => this._onDidChangeTreeData.fire(undefined));
    return [new LoadingItem()];
  }

  private async loadDatasets(): Promise<void> {
    if (!this.client) return;
    try {
      const datasets = await this.client.getDatasets(this.maxDatasets);
      this.datasetsCache = datasets;
      this.datasetsError = undefined;
    } catch (err) {
      this.datasetsCache = undefined;
      this.datasetsError = err instanceof Error ? err.message : String(err);
    } finally {
      this.loadingDatasets = false;
    }
  }
}


import * as vscode from "vscode";
import { createClient, LangSmithClient } from "./api/langsmithClient";
import { ApiKeyManager } from "./auth/secretStorage";
import { defaultFilter, RunFilter } from "./models/filterState";
import { LangSmithRun } from "./models/types";
import { ProjectsProvider } from "./views/projectsProvider";
import { RunsProvider } from "./views/runsProvider";
import { DatasetsProvider } from "./views/datasetsProvider";
import { TracePanel } from "./views/tracePanel";
import { PromptDiffViewer } from "./views/diffViewer";

let pollingHandle: NodeJS.Timeout | undefined;
let promptDiffBaseRun: LangSmithRun | undefined;

function getLangtraceConfig() {
  return vscode.workspace.getConfiguration("langtrace");
}

export async function activate(context: vscode.ExtensionContext) {
  const apiKeyManager = new ApiKeyManager(context);

  const runsProvider = new RunsProvider();
  const projectsProvider = new ProjectsProvider((project) => {
    runsProvider.setProject(project);
  });
  const datasetsProvider = new DatasetsProvider();

  let currentFilter: RunFilter = { ...defaultFilter };

  let client: LangSmithClient | undefined;

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "LangTrace: No API Key";
  statusBar.show();

  const syncSettings = () => {
    const config = getLangtraceConfig();
    const maxRuns = config.get<number>("maxRuns", 50);
    projectsProvider.setMaxRuns(maxRuns);
    runsProvider.setMaxRuns(maxRuns);
    datasetsProvider.setMaxRuns(maxRuns);
  };

  const setConnected = (connected: boolean) => {
    statusBar.text = connected ? "LangTrace: Connected" : "LangTrace: No API Key";
  };

  const setClientFromStoredKey = async (opts?: { verifyConnection?: boolean; showMessages?: boolean }) => {
    const verifyConnection = opts?.verifyConnection ?? false;
    const showMessages = opts?.showMessages ?? false;

    const config = getLangtraceConfig();
    const baseUrl = config.get<string>("baseUrl", "https://api.smith.langchain.com");
    const apiKey = await apiKeyManager.getApiKey();

    if (!apiKey) {
      client = undefined;
      projectsProvider.setClient(undefined);
      runsProvider.setClient(undefined);
      datasetsProvider.setClient(undefined);
      promptDiffBaseRun = undefined;
      setConnected(false);
      return;
    }

    const nextClient = createClient(baseUrl, apiKey);

    if (verifyConnection) {
      try {
        // Verify the key by making a lightweight request.
        await nextClient.getProjects();
      } catch (err) {
        client = undefined;
        projectsProvider.setClient(undefined);
        runsProvider.setClient(undefined);
        datasetsProvider.setClient(undefined);
        promptDiffBaseRun = undefined;
        setConnected(false);

        if (showMessages) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`LangTrace: Failed to connect: ${message}`);
        }
        return;
      }
    }

    client = nextClient;
    projectsProvider.setClient(client);
    runsProvider.setClient(client);
    datasetsProvider.setClient(client);
    syncSettings();
    setConnected(true);

    if (showMessages) {
      vscode.window.showInformationMessage("LangTrace: Connected");
    }
  };

  // Initialize tree views.
  const projectsView = vscode.window.createTreeView("langtrace.projects", {
    treeDataProvider: projectsProvider,
  });
  const runsView = vscode.window.createTreeView("langtrace.runs", {
    treeDataProvider: runsProvider,
  });
  const datasetsView = vscode.window.createTreeView("langtrace.datasets", {
    treeDataProvider: datasetsProvider,
  });

  context.subscriptions.push(projectsView, runsView, datasetsView, statusBar);

  // Register commands.
  const disposableSetApiKey = vscode.commands.registerCommand("langtrace.setApiKey", async () => {
    const value = await vscode.window.showInputBox({
      prompt: "Paste your LangSmith API key (starts with ls__)",
      placeHolder: "ls__...",
      ignoreFocusOut: true,
      password: true,
    });

    if (!value) return;

    const key = value.trim();

    if (!key) {
      vscode.window.showErrorMessage("LangTrace: API key cannot be empty.");
      return;
    }

    if (key.length < 10) {
      vscode.window.showErrorMessage("LangTrace: API key is too short. Expected at least 10 characters.");
      return;
    }

    await apiKeyManager.setApiKey(key);
    await setClientFromStoredKey({ verifyConnection: true, showMessages: true });
  });

  const disposableClearApiKey = vscode.commands.registerCommand("langtrace.clearApiKey", async () => {
    const ok = await vscode.window.showWarningMessage(
      "Clear the stored LangSmith API key for LangTrace?",
      { modal: true },
      "Clear"
    );
    if (ok !== "Clear") return;

    await apiKeyManager.clearApiKey();
    await setClientFromStoredKey();
    vscode.window.showInformationMessage("LangTrace: API key cleared.");
  });

  const disposableRefresh = vscode.commands.registerCommand("langtrace.refresh", async () => {
    syncSettings();
    projectsProvider.refresh();
    runsProvider.refresh();
    datasetsProvider.refresh();
    vscode.window.showInformationMessage("LangTrace refreshed.");
  });

  const disposableRefreshDatasets = vscode.commands.registerCommand("langtrace.refreshDatasets", async () => {
    syncSettings();
    datasetsProvider.refresh();
    vscode.window.showInformationMessage("LangTrace datasets refreshed.");
  });

  const disposableOpenInBrowser = vscode.commands.registerCommand("langtrace.openInBrowser", async () => {
    vscode.env.openExternal(vscode.Uri.parse("https://smith.langchain.com"));
  });

  const disposableOpenTrace = vscode.commands.registerCommand(
    "langtrace.openTrace",
    async (runId: string) => {
      if (!client) {
        vscode.window.showErrorMessage("LangTrace: No API key configured. Use 'LangTrace: Set API Key'.");
        return;
      }
      if (!runId) return;
      await TracePanel.createOrShow(context, client, runId);
    }
  );

  const disposableCopyRunId = vscode.commands.registerCommand(
    "langtrace.copyRunId",
    async (runItem: { run?: { id?: string } }) => {
      const runId = runItem?.run?.id;
      if (!runId) return;
      await vscode.env.clipboard.writeText(runId);
      vscode.window.showInformationMessage("Run ID copied to clipboard");
    }
  );

  const disposableDiffPrompts = vscode.commands.registerCommand(
    "langtrace.diffPrompts",
    async (runItem: { run?: LangSmithRun }) => {
      const run = runItem?.run;
      if (!run) return;

      if (!promptDiffBaseRun) {
        promptDiffBaseRun = run;
        vscode.window.showInformationMessage(
          "Run selected as base for comparison. Right-click another run to compare."
        );
        return;
      }

      await PromptDiffViewer.show(context, promptDiffBaseRun, run);
      promptDiffBaseRun = undefined;
    }
  );

  const disposableFilterByStatus = vscode.commands.registerCommand(
    "langtrace.filterByStatus",
    async () => {
      const picked = await vscode.window.showQuickPick(
        ["All", "Success", "Error", "Pending"],
        { placeHolder: "Select status filter" }
      );
      if (!picked) return;

      const status =
        picked === "All"
          ? "all"
          : picked === "Success"
            ? "success"
            : picked === "Error"
              ? "error"
              : "pending";

      currentFilter = { ...currentFilter, status };
      runsProvider.setFilter(currentFilter);
      runsProvider.refresh();
    }
  );

  const disposableFilterBySearch = vscode.commands.registerCommand(
    "langtrace.filterBySearch",
    async () => {
      const value = await vscode.window.showInputBox({
        prompt: "Search by run name",
      });
      if (value === undefined) return;

      currentFilter = { ...currentFilter, search: value.trim() };
      runsProvider.setFilter(currentFilter);
      runsProvider.refresh();
    }
  );

  const disposableClearFilters = vscode.commands.registerCommand(
    "langtrace.clearFilters",
    async () => {
      currentFilter = { ...defaultFilter };
      runsProvider.setFilter(currentFilter);
      runsProvider.refresh();
    }
  );

  const disposableLoadMoreProjectRuns = vscode.commands.registerCommand(
    "langtrace.loadMoreProjectRuns",
    async (projectId: string) => {
      await projectsProvider.loadMore(projectId);
    }
  );

  const disposableLoadMoreRunsPanel = vscode.commands.registerCommand(
    "langtrace.loadMoreRunsPanel",
    async () => {
      await runsProvider.loadMore();
    }
  );

  context.subscriptions.push(
    disposableSetApiKey,
    disposableClearApiKey,
    disposableRefresh,
    disposableRefreshDatasets,
    disposableOpenInBrowser,
    disposableOpenTrace,
    disposableCopyRunId,
    disposableDiffPrompts,
    disposableFilterByStatus,
    disposableFilterBySearch,
    disposableClearFilters,
    disposableLoadMoreProjectRuns,
    disposableLoadMoreRunsPanel
  );

  // Initial client setup.
  await setClientFromStoredKey();

  // Polling.
  const config = getLangtraceConfig();
  const pollIntervalSecs = config.get<number>("pollInterval", 30);
  if (pollIntervalSecs > 0) {
    pollingHandle = setInterval(() => {
      if (!client) return;
      syncSettings();
      projectsProvider.refresh();
      runsProvider.refresh();
    }, pollIntervalSecs * 1000);
    context.subscriptions.push({
      dispose: () => {
        if (pollingHandle) clearInterval(pollingHandle);
        pollingHandle = undefined;
      },
    });
  }
}

export function deactivate() {
  if (pollingHandle) clearInterval(pollingHandle);
  pollingHandle = undefined;
}


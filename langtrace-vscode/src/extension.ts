import * as vscode from "vscode";
import { createClient, LangSmithClient } from "./api/langsmithClient";
import { ApiKeyManager } from "./auth/secretStorage";
import { ProjectsProvider } from "./views/projectsProvider";
import { RunsProvider } from "./views/runsProvider";
import { TracePanel } from "./views/tracePanel";

let pollingHandle: NodeJS.Timeout | undefined;

function getLangtraceConfig() {
  return vscode.workspace.getConfiguration("langtrace");
}

export async function activate(context: vscode.ExtensionContext) {
  const apiKeyManager = new ApiKeyManager(context);

  const runsProvider = new RunsProvider();
  const projectsProvider = new ProjectsProvider((project) => {
    runsProvider.setProject(project);
  });

  let client: LangSmithClient | undefined;

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "LangTrace: No API Key";
  statusBar.show();

  const syncSettings = () => {
    const config = getLangtraceConfig();
    const maxRuns = config.get<number>("maxRuns", 50);
    projectsProvider.setMaxRuns(maxRuns);
    runsProvider.setMaxRuns(maxRuns);
  };

  const setConnected = (connected: boolean) => {
    statusBar.text = connected ? "LangTrace: Connected" : "LangTrace: No API Key";
  };

  const setClientFromStoredKey = async () => {
    const config = getLangtraceConfig();
    const baseUrl = config.get<string>("baseUrl", "https://api.smith.langchain.com");
    const apiKey = await apiKeyManager.getApiKey();

    if (!apiKey) {
      client = undefined;
      projectsProvider.setClient(undefined);
      runsProvider.setClient(undefined);
      setConnected(false);
      return;
    }

    client = createClient(baseUrl, apiKey);
    projectsProvider.setClient(client);
    runsProvider.setClient(client);
    syncSettings();
    setConnected(true);
  };

  // Initialize tree views.
  const projectsView = vscode.window.createTreeView("langtrace.projects", {
    treeDataProvider: projectsProvider,
  });
  const runsView = vscode.window.createTreeView("langtrace.runs", {
    treeDataProvider: runsProvider,
  });

  context.subscriptions.push(projectsView, runsView, statusBar);

  // Register commands.
  const disposableSetApiKey = vscode.commands.registerCommand("langtrace.setApiKey", async () => {
    const value = await vscode.window.showInputBox({
      prompt: "Paste your LangSmith API key (starts with ls__)",
      placeHolder: "ls__...",
      ignoreFocusOut: true,
      password: true,
    });

    if (!value) return;
    if (!value.startsWith("ls__")) {
      vscode.window.showErrorMessage("Invalid LangSmith API key. Expected it to start with 'ls__'.");
      return;
    }

    await apiKeyManager.setApiKey(value.trim());
    await setClientFromStoredKey();
    vscode.window.showInformationMessage("LangTrace: API key saved.");
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
    vscode.window.showInformationMessage("LangTrace refreshed.");
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

  context.subscriptions.push(
    disposableSetApiKey,
    disposableClearApiKey,
    disposableRefresh,
    disposableOpenInBrowser,
    disposableOpenTrace
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


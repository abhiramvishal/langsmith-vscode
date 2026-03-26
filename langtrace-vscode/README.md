# LangTrace — LangSmith for VS Code

> Browse your LangSmith traces, runs, projects, and datasets without leaving the editor.

![Unofficial](https://img.shields.io/badge/Unofficial-community-7b6cff)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## What it does

LangTrace connects directly to the [LangSmith](https://smith.langchain.com) API and surfaces your observability data as a native VS Code sidebar. No context-switching to the browser — inspect traces, debug failing runs, and review prompt inputs/outputs right in your editor.

---

## Features

### Projects
- Lists all your LangSmith projects (sessions) in a tree view
- Shows run count, p50 latency, and error rate per project at a glance
- Projects with >10% error rate are highlighted with a warning icon

### Runs
- Browse runs for any project — filtered to the last N runs (configurable)
- Each run shows its **type icon** (LLM / Chain / Tool / Retriever / Embedding), latency, and prompt/completion token counts
- Filter by status (success / error / pending) or search by run name
- Load more runs with a single click

### Trace Detail
- Click any run to open a full trace tree in a side panel
- **LLM runs** render as a chat thread — system, user, and assistant messages displayed as conversation bubbles
- All other runs show syntax-highlighted JSON for inputs and outputs
- Expand / collapse individual steps or use **Expand all / Collapse all**
- Header shows total latency, prompt↑ and completion↓ token split, and start time

### Datasets
- Lists all LangSmith datasets with example count and data type
- Hover tooltip shows created/modified dates and dataset ID

---

## Getting Started

### 1. Install the extension

Search for **LangTrace** in the VS Code Extensions panel, or install from the Marketplace.

### 2. Get a LangSmith API key

1. Open [smith.langchain.com](https://smith.langchain.com)
2. Go to **Settings → API Keys → Create API Key**
3. Copy the key (starts with `ls__`)

### 3. Connect

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

```
LangTrace: Set API Key
```

Paste your key and press Enter. The sidebar will populate immediately.

---

## Commands

| Command | Description |
|---|---|
| `LangTrace: Set API Key` | Store your LangSmith API key securely |
| `LangTrace: Clear API Key` | Remove the stored key |
| `LangTrace: Refresh` | Re-fetch projects and runs |
| `LangTrace: Open in Browser` | Open smith.langchain.com |
| `LangTrace: Filter by Status` | Filter the runs panel by success / error / pending |
| `LangTrace: Search Runs` | Filter runs by name |
| `LangTrace: Clear All Filters` | Remove all active filters |
| `LangTrace: Compare Prompts` | Diff the inputs of two runs side-by-side |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `langtrace.pollInterval` | `30` | Auto-refresh interval in seconds (`0` to disable) |
| `langtrace.maxRuns` | `50` | Max runs to fetch per project |
| `langtrace.baseUrl` | `https://api.smith.langchain.com` | API base URL — change for self-hosted LangSmith |

---

## Self-hosted LangSmith

If you run a private LangSmith instance, update the base URL in settings:

```json
"langtrace.baseUrl": "https://your-langsmith.internal"
```

---

## Disclaimer

This is an unofficial community extension and is not affiliated with, endorsed by, or supported by LangChain, Inc.

## License

MIT

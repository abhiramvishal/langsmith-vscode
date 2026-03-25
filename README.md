## LangTrace

![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/community/langtrace-vscode?label=VS%20Code%20Marketplace%20version)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Unofficial](https://img.shields.io/badge/Unofficial-community-7b6cff)

Unofficial LangSmith client for VS Code.

## What it does

LangTrace connects to the LangSmith API and lets you browse projects and runs directly in VS Code, with trace details opened in a built-in webview.

## Features

- Projects tree view with run counts
- Runs tree view for the currently selected project
- Trace detail webview with expandable steps and JSON for inputs/outputs
- Auto-refresh with configurable polling

Screenshots: add screenshots here (Projects view, Runs view, Trace webview).

## Installation

1. **Marketplace:** Install `LangTrace` from the VS Code Marketplace.
2. **Manual (VSIX):** Download the `.vsix` file (e.g., from releases) and install via `Extensions: Install from VSIX...` in VS Code.

## Setup

1. Create an API key in the LangSmith UI (API keys). The key should start with `ls__`.
2. In VS Code, run **`LangTrace: Set API Key`** from the Command Palette.
3. Paste the API key and confirm.

## Extension Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `langtrace.pollInterval` | number | `30` | Auto-refresh interval in seconds (`0` disables) |
| `langtrace.maxRuns` | number | `50` | Maximum number of runs to fetch per project |
| `langtrace.baseUrl` | string | `https://api.smith.langchain.com` | LangSmith API base URL (for self-hosted instances) |

## Commands

| Command | Description |
| --- | --- |
| `langtrace.setApiKey` | Store a LangSmith API key in VS Code SecretStorage |
| `langtrace.clearApiKey` | Remove the stored LangSmith API key |
| `langtrace.refresh` | Refresh projects/runs from the API |
| `langtrace.openInBrowser` | Open the LangSmith site in your browser |

## Known limitations

- LangSmith API responses (including run/trace structure) may change and could require updates to this extension.
- Very large traces may render slowly due to recursive loading and large JSON payloads.

## Disclaimer

This is an unofficial community extension and is not affiliated with, endorsed by, or supported by LangChain, Inc.

## License

MIT


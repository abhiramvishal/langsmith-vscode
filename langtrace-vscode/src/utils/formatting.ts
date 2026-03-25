import * as vscode from "vscode";
import { RunStatus } from "../models/types";

export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms)) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  const fixed = s.toFixed(1).replace(/\.0$/, "");
  return `${fixed}s`;
}

export function formatTokens(count: number): string {
  if (!Number.isFinite(count)) return "0";
  if (count < 1000) return `${Math.round(count)}`;
  const k = count / 1000;
  const fixed = k.toFixed(1).replace(/\.0$/, "");
  return `${fixed}k`;
}

export function formatTimestamp(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const now = Date.now();
  const diffMs = now - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const seconds = Math.round(abs / 1000);
  const minutes = Math.round(abs / (60 * 1000));
  const hours = Math.round(abs / (60 * 60 * 1000));
  const days = Math.round(abs / (24 * 60 * 60 * 1000));

  const suffix = future ? "from now" : "ago";

  if (abs < 60 * 1000) {
    return `${seconds}s ${suffix}`;
  }
  if (abs < 60 * 60 * 1000) {
    return `${minutes} mins ${suffix}`;
  }
  if (abs < 24 * 60 * 60 * 1000) {
    return `${hours} hours ${suffix}`;
  }

  // Older than a day: show a short calendar date.
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
}

export function getStatusIcon(status: RunStatus): string {
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

export function getStatusColor(status: RunStatus): vscode.ThemeColor {
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


import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { LangSmithRun } from "../models/types";

export class PromptDiffViewer {
  public static async show(
    context: vscode.ExtensionContext,
    run1: LangSmithRun,
    run2: LangSmithRun
  ): Promise<void> {
    const diffsDirUri = vscode.Uri.joinPath(context.globalStorageUri, "diffs");
    const diffsDirPath = diffsDirUri.fsPath;
    await fs.promises.mkdir(diffsDirPath, { recursive: true });

    const prompt1 = PromptDiffViewer.extractPromptText(
      (run1.inputs && typeof run1.inputs === "object" ? (run1.inputs as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >
    );
    const prompt2 = PromptDiffViewer.extractPromptText(
      (run2.inputs && typeof run2.inputs === "object" ? (run2.inputs as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >
    );

    const file1 = path.join(diffsDirPath, `run-${run1.id}.txt`);
    const file2 = path.join(diffsDirPath, `run-${run2.id}.txt`);

    await fs.promises.writeFile(file1, prompt1, "utf8");
    await fs.promises.writeFile(file2, prompt2, "utf8");

    const uri1 = vscode.Uri.file(file1);
    const uri2 = vscode.Uri.file(file2);
    const title = `Prompt: ${run1.name || run1.id} ↔ ${run2.name || run2.id}`;

    await vscode.commands.executeCommand("vscode.diff", uri1, uri2, title);
  }

  public static extractPromptText(inputs: Record<string, unknown>): string {
    const messages = inputs["messages"];
    if (Array.isArray(messages)) {
      const lines: string[] = [];
      for (const m of messages) {
        if (!m || typeof m !== "object") continue;
        const role = (m as any).role;
        const content = (m as any).content;
        if (typeof role === "string" && typeof content === "string") {
          lines.push(`${role}: ${content}`);
        } else {
          lines.push(JSON.stringify(m));
        }
      }
      if (lines.length > 0) return lines.join("\n");
    }

    const prompt = inputs["prompt"];
    if (typeof prompt === "string") return prompt;

    const input = inputs["input"];
    if (typeof input === "string") return input;

    try {
      return JSON.stringify(inputs, null, 2);
    } catch {
      return String(inputs);
    }
  }
}


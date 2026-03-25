import * as vscode from "vscode";

const API_KEY_SECRET_NAME = "langtrace.apiKey";

export class ApiKeyManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async getApiKey(): Promise<string | undefined> {
    const key = await this.context.secrets.get(API_KEY_SECRET_NAME);
    return key ?? undefined;
  }

  public async setApiKey(key: string): Promise<void> {
    await this.context.secrets.store(API_KEY_SECRET_NAME, key);
  }

  public async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(API_KEY_SECRET_NAME);
  }

  public async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey();
    return !!key;
  }
}


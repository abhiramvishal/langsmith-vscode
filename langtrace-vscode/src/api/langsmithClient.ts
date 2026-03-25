import { LangSmithProject, LangSmithRun, RunStatus } from "../models/types";

export class LangSmithClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private async requestJson<T>(path: string): Promise<T> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${base}${path}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "accept": "application/json",
      },
    });

    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // ignore
      }
      const snippet = body && body.length > 800 ? body.slice(0, 800) + "..." : body;
      throw new Error(
        `LangSmith API request failed (${res.status} ${res.statusText}) for ${url}${snippet ? `: ${snippet}` : ""}`
      );
    }

    return (await res.json()) as T;
  }

  public async getProjects(): Promise<LangSmithProject[]> {
    const data = await this.requestJson<any>("/api/v1/projects");
    const projects = Array.isArray(data)
      ? data
      : Array.isArray(data?.projects)
        ? data.projects
        : Array.isArray(data?.data)
          ? data.data
          : undefined;

    if (!projects) return [];
    return projects as LangSmithProject[];
  }

  public async getRuns(projectId: string, limit: number): Promise<LangSmithRun[]> {
    const q = `session_id=${encodeURIComponent(projectId)}&limit=${encodeURIComponent(String(limit))}&order=desc`;
    const data = await this.requestJson<any>(`/api/v1/runs?${q}`);
    const runs = Array.isArray(data)
      ? data
      : Array.isArray(data?.runs)
        ? data.runs
        : Array.isArray(data?.data)
          ? data.data
          : undefined;

    if (!runs) return [];
    return runs as LangSmithRun[];
  }

  public async getRun(runId: string): Promise<LangSmithRun> {
    const data = await this.requestJson<any>(`/api/v1/runs/${encodeURIComponent(runId)}`);
    const run = data?.run ?? data;
    if (!run || typeof run !== "object") {
      throw new Error(`Unexpected LangSmith getRun response shape for runId=${runId}`);
    }
    return run as LangSmithRun;
  }

  public async getRunChildren(runId: string): Promise<LangSmithRun[]> {
    // As provided: check /api/v1/runs?parent_run=true&id={runId}.
    const q = `parent_run=true&id=${encodeURIComponent(runId)}`;
    const data = await this.requestJson<any>(`/api/v1/runs?${q}`);
    const runs = Array.isArray(data)
      ? data
      : Array.isArray(data?.runs)
        ? data.runs
        : Array.isArray(data?.data)
          ? data.data
          : undefined;

    if (!runs) return [];
    return runs as LangSmithRun[];
  }

  public static normalizeStatus(status: unknown): RunStatus {
    if (status === "success" || status === "error" || status === "pending") return status;
    if (typeof status === "string") {
      const s = status.toLowerCase();
      if (s.includes("success")) return "success";
      if (s.includes("error") || s.includes("fail")) return "error";
      if (s.includes("pending") || s.includes("running") || s.includes("in_progress")) return "pending";
    }
    return "pending";
  }
}

export function createClient(baseUrl: string, apiKey: string): LangSmithClient {
  return new LangSmithClient(baseUrl, apiKey);
}


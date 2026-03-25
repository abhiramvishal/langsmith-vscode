import { LangSmithDataset, LangSmithProject, LangSmithRun, RunStatus } from "../models/types";

export class LangSmithClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private async requestJson<T>(path: string): Promise<T> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${base}${path}`;

    const maxRetries = 3; // retry up to 3 times after the initial attempt
    const backoffDelaysMs = [1000, 2000, 4000];

    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const makeHttpError = async (res: Response) => {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // ignore
      }
      const snippet = body && body.length > 800 ? body.slice(0, 800) + "..." : body;
      const err = new Error(
        `LangSmith API request failed (${res.status} ${res.statusText}) for ${url}${snippet ? `: ${snippet}` : ""}`
      ) as Error & { statusCode?: number };
      err.statusCode = res.status;
      return err;
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "x-api-key": this.apiKey,
            accept: "application/json",
          },
        });

        if (!res.ok) {
          const httpErr = await makeHttpError(res);
          const statusCode = (httpErr as { statusCode?: number }).statusCode ?? res.status;

          // Never retry these.
          if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
            throw httpErr;
          }

          const isRetriable5xx = statusCode >= 500 && statusCode <= 599;
          if (isRetriable5xx && attempt < maxRetries) {
            lastErr = httpErr;
            await delay(backoffDelaysMs[attempt] ?? 4000);
            continue;
          }

          throw httpErr;
        }

        return (await res.json()) as T;
      } catch (err) {
        lastErr = err;

        const statusCode = (err as { statusCode?: number }).statusCode;
        const isRetriable5xx = typeof statusCode === "number" && statusCode >= 500 && statusCode <= 599;

        // If it's an HTTP error we decided not to retry (401/403/404/other), surface immediately.
        if (typeof statusCode === "number" && !isRetriable5xx) {
          throw err;
        }

        // Network error or retriable 5xx: retry with backoff.
        if (attempt < maxRetries) {
          await delay(backoffDelaysMs[attempt] ?? 4000);
          continue;
        }

        const retriesDone = maxRetries;
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `LangSmith API request failed after ${retriesDone} retries for ${url}: ${message}`
        );
      }
    }

    // Should be unreachable.
    const retriesDone = maxRetries;
    const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`LangSmith API request failed after ${retriesDone} retries for ${url}: ${message}`);
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

  public async getDatasets(limit: number): Promise<LangSmithDataset[]> {
    const q = `limit=${encodeURIComponent(String(limit))}`;
    const data = await this.requestJson<any>(`/api/v1/datasets?${q}`);

    const datasets = Array.isArray(data)
      ? data
      : Array.isArray(data?.datasets)
        ? data.datasets
        : Array.isArray(data?.data)
          ? data.data
          : undefined;

    if (!datasets) return [];
    return datasets as LangSmithDataset[];
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


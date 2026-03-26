import {
  Commit,
  Dataset,
  Example,
  Feedback,
  LangSmithDataset,
  LangSmithProject,
  LangSmithRun,
  PostDatasetRunsBody,
  PostFeedbackBody,
  PostThreadsQueryBody,
  Repo,
  ReposListResponse,
  RunsQueryBody,
  RunsQueryResponse,
  RunStatus,
  Thread,
  ThreadsQueryResponse,
  TracerSession,
} from "../models/types";

export class LangSmithClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private authHeaders(jsonBody: boolean): Record<string, string> {
    const h: Record<string, string> = {
      "X-Api-Key": this.apiKey,
      Accept: "application/json",
    };
    if (jsonBody) {
      h["Content-Type"] = "application/json";
    }
    return h;
  }

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
          headers: this.authHeaders(false),
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

  private async postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${base}${path}`;

    const maxRetries = 3; // retry up to 3 times after the initial attempt
    const backoffDelaysMs = [1000, 2000, 4000];

    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const makeHttpError = async (res: Response) => {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {
        // ignore
      }
      const snippet = bodyText && bodyText.length > 800 ? bodyText.slice(0, 800) + "..." : bodyText;
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
          method: "POST",
          headers: this.authHeaders(true),
          body: JSON.stringify(body),
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

  private async deleteRequest(path: string): Promise<void> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${base}${path}`;

    const maxRetries = 3;
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
          method: "DELETE",
          headers: this.authHeaders(false),
        });

        if (!res.ok) {
          const httpErr = await makeHttpError(res);
          const statusCode = (httpErr as { statusCode?: number }).statusCode ?? res.status;

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

        return;
      } catch (err) {
        lastErr = err;

        const statusCode = (err as { statusCode?: number }).statusCode;
        const isRetriable5xx = typeof statusCode === "number" && statusCode >= 500 && statusCode <= 599;

        if (typeof statusCode === "number" && !isRetriable5xx) {
          throw err;
        }

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

    const retriesDone = maxRetries;
    const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`LangSmith API request failed after ${retriesDone} retries for ${url}: ${message}`);
  }

  private static normalizeList<T>(
    data: any,
    keys: Array<"sessions" | "projects" | "data" | "datasets" | "runs" | "examples" | "feedback">
  ): T[] | undefined {
    if (Array.isArray(data)) return data as T[];
    for (const k of keys) {
      if (Array.isArray(data?.[k])) return data[k] as T[];
    }
    return undefined;
  }

  private static normalizeRunsPayload(data: any): LangSmithRun[] {
    const runs = LangSmithClient.normalizeList<LangSmithRun>(data, ["runs", "data"]);
    if (!runs) return [];
    return runs;
  }

  // --- SEMANTICS: Sessions / projects ---

  public async listSessions(params?: {
    limit?: number;
    offset?: number;
    name_contains?: string;
    include_stats?: boolean;
  }): Promise<TracerSession[]> {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.name_contains != null) q.set("name_contains", params.name_contains);
    if (params?.include_stats != null) q.set("include_stats", String(params.include_stats));
    const qs = q.toString();
    const path = qs ? `/api/v1/sessions?${qs}` : "/api/v1/sessions";
    const data = await this.requestJson<any>(path);
    const list = LangSmithClient.normalizeList<TracerSession>(data, ["sessions", "projects", "data"]);
    if (!list) return [];
    return list;
  }

  public async getProjects(): Promise<LangSmithProject[]> {
    // include_stats may be unsupported on some plans; try with it, fall back without.
    try {
      return await this.listSessions({ limit: 100, offset: 0, include_stats: true });
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 400 || code === 422) {
        return this.listSessions({ limit: 100, offset: 0 });
      }
      throw err;
    }
  }

  public async getSession(sessionId: string, include_stats?: boolean): Promise<TracerSession> {
    const q = new URLSearchParams();
    if (include_stats != null) q.set("include_stats", String(include_stats));
    const qs = q.toString();
    const path = qs
      ? `/api/v1/sessions/${encodeURIComponent(sessionId)}?${qs}`
      : `/api/v1/sessions/${encodeURIComponent(sessionId)}`;
    return this.requestJson<TracerSession>(path);
  }

  public async getSessionMetadata(
    sessionId: string,
    params?: { metadata_keys?: string | string[]; k?: number; root_runs_only?: boolean }
  ): Promise<Record<string, unknown>> {
    const q = new URLSearchParams();
    const keys = params?.metadata_keys;
    if (keys != null) {
      if (Array.isArray(keys)) for (const k of keys) q.append("metadata_keys", k);
      else q.set("metadata_keys", keys);
    }
    if (params?.k != null) q.set("k", String(params.k));
    if (params?.root_runs_only != null) q.set("root_runs_only", String(params.root_runs_only));
    const qs = q.toString();
    const path = qs
      ? `/api/v1/sessions/${encodeURIComponent(sessionId)}/metadata?${qs}`
      : `/api/v1/sessions/${encodeURIComponent(sessionId)}/metadata`;
    return this.requestJson<Record<string, unknown>>(path);
  }

  // --- Runs ---

  public async postRunsQuery(body: RunsQueryBody): Promise<RunsQueryResponse> {
    return this.postJson<RunsQueryResponse>(
      "/api/v1/runs/query",
      body as unknown as Record<string, unknown>
    );
  }

  public async postRunStats(body: RunsQueryBody): Promise<Record<string, unknown>> {
    return this.postJson<Record<string, unknown>>(
      "/api/v1/runs/stats",
      body as unknown as Record<string, unknown>
    );
  }

  public async getRuns(projectId: string, limit: number, cursor?: string): Promise<LangSmithRun[]> {
    const body: Record<string, unknown> = {
      session_id: [projectId],
      limit,
    };
    if (cursor != null) body.cursor = cursor;
    const data = await this.postJson<any>("/api/v1/runs/query", body);
    return LangSmithClient.normalizeRunsPayload(data);
  }

  public async getRun(
    runId: string,
    options?: { include_messages?: boolean; exclude_s3_stored_attributes?: boolean }
  ): Promise<LangSmithRun> {
    const q = new URLSearchParams();
    if (options?.include_messages != null) q.set("include_messages", String(options.include_messages));
    if (options?.exclude_s3_stored_attributes != null) {
      q.set("exclude_s3_stored_attributes", String(options.exclude_s3_stored_attributes));
    }
    const qs = q.toString();
    const path = qs
      ? `/api/v1/runs/${encodeURIComponent(runId)}?${qs}`
      : `/api/v1/runs/${encodeURIComponent(runId)}`;
    const data = await this.requestJson<any>(path);
    const run = data?.run ?? data;
    if (!run || typeof run !== "object") {
      throw new Error(`Unexpected LangSmith getRun response shape for runId=${runId}`);
    }
    return run as LangSmithRun;
  }

  public async getRunChildren(runId: string): Promise<LangSmithRun[]> {
    const parent = await this.getRun(runId);
    const traceId = parent.trace_id ?? parent.id;
    // Fetch all runs in the trace, then filter to direct children client-side.
    // Omit parent_run to avoid 400s on accounts that don't support that filter.
    const data = await this.postJson<any>("/api/v1/runs/query", {
      trace_id: traceId,
      limit: 200,
    });
    const runs = LangSmithClient.normalizeRunsPayload(data);
    return runs.filter((r) => r.parent_run_id === runId);
  }

  // --- Datasets ---

  public async listDatasets(params?: {
    limit?: number;
    offset?: number;
    name_contains?: string;
  }): Promise<Dataset[]> {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.name_contains != null) q.set("name_contains", params.name_contains);
    const qs = q.toString();
    const path = qs ? `/api/v1/datasets?${qs}` : "/api/v1/datasets";
    const data = await this.requestJson<any>(path);
    const list = LangSmithClient.normalizeList<Dataset>(data, ["datasets", "data"]);
    if (!list) return [];
    return list;
  }

  public async getDatasets(limit: number): Promise<LangSmithDataset[]> {
    return this.listDatasets({ limit });
  }

  public async getDataset(datasetId: string): Promise<Dataset> {
    return this.requestJson<Dataset>(`/api/v1/datasets/${encodeURIComponent(datasetId)}`);
  }

  public async postDatasetRuns(
    datasetId: string,
    body: PostDatasetRunsBody
  ): Promise<Record<string, unknown>> {
    return this.postJson<Record<string, unknown>>(
      `/api/v1/datasets/${encodeURIComponent(datasetId)}/runs`,
      body as unknown as Record<string, unknown>
    );
  }

  // --- Examples ---

  public async listExamples(params: {
    dataset: string;
    limit?: number;
    offset?: number;
    as_of?: string;
  }): Promise<Example[]> {
    const q = new URLSearchParams();
    q.set("dataset", params.dataset);
    if (params.limit != null) q.set("limit", String(params.limit));
    if (params.offset != null) q.set("offset", String(params.offset));
    if (params.as_of != null) q.set("as_of", params.as_of);
    const data = await this.requestJson<any>(`/api/v1/examples?${q.toString()}`);
    const list = LangSmithClient.normalizeList<Example>(data, ["examples", "data"]);
    if (!list) return [];
    return list;
  }

  public async getExample(exampleId: string): Promise<Example> {
    return this.requestJson<Example>(`/api/v1/examples/${encodeURIComponent(exampleId)}`);
  }

  public async getExamplesCount(dataset: string): Promise<number> {
    const q = new URLSearchParams({ dataset });
    const data = await this.requestJson<{ count: number }>(`/api/v1/examples/count?${q.toString()}`);
    return typeof data?.count === "number" ? data.count : 0;
  }

  // --- Feedback ---

  public async listFeedback(params?: {
    run?: string[];
    session?: string[];
    key?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Feedback[]> {
    const q = new URLSearchParams();
    if (params?.run) for (const id of params.run) q.append("run", id);
    if (params?.session) for (const id of params.session) q.append("session", id);
    if (params?.key) for (const k of params.key) q.append("key", k);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    const path = qs ? `/api/v1/feedback?${qs}` : "/api/v1/feedback";
    const data = await this.requestJson<any>(path);
    const list = LangSmithClient.normalizeList<Feedback>(data, ["feedback", "data"]);
    if (!list) return [];
    return list;
  }

  public async postFeedback(body: PostFeedbackBody): Promise<Feedback> {
    return this.postJson<Feedback>("/api/v1/feedback", body as unknown as Record<string, unknown>);
  }

  public async deleteFeedback(feedbackId: string): Promise<void> {
    await this.deleteRequest(`/api/v1/feedback/${encodeURIComponent(feedbackId)}`);
  }

  // --- Repos (prompts) ---

  public async listRepos(params?: {
    limit?: number;
    offset?: number;
    query?: string;
    has_commits?: boolean;
    with_latest_manifest?: boolean;
  }): Promise<ReposListResponse> {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.query != null) q.set("query", params.query);
    if (params?.has_commits != null) q.set("has_commits", String(params.has_commits));
    if (params?.with_latest_manifest != null) {
      q.set("with_latest_manifest", String(params.with_latest_manifest));
    }
    const qs = q.toString();
    const path = qs ? `/api/v1/repos?${qs}` : "/api/v1/repos";
    return this.requestJson<ReposListResponse>(path);
  }

  public async getRepo(owner: string, repo: string): Promise<Repo> {
    return this.requestJson<Repo>(
      `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );
  }

  // --- Commits (paths at /commits, not /api/v1) ---

  public async listCommits(
    owner: string,
    repo: string,
    params?: { limit?: number; offset?: number; tag?: string }
  ): Promise<Commit[]> {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.tag != null) q.set("tag", params.tag);
    const qs = q.toString();
    const basePath = `/commits/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const path = qs ? `${basePath}?${qs}` : basePath;
    const data = await this.requestJson<any>(path);
    if (Array.isArray(data)) return data as Commit[];
    if (Array.isArray(data?.commits)) return data.commits as Commit[];
    if (Array.isArray(data?.data)) return data.data as Commit[];
    return [];
  }

  public async getCommit(
    owner: string,
    repo: string,
    commit: string,
    include_model?: boolean
  ): Promise<Commit> {
    const q = new URLSearchParams();
    if (include_model != null) q.set("include_model", String(include_model));
    const qs = q.toString();
    const basePath = `/commits/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(commit)}`;
    const path = qs ? `${basePath}?${qs}` : basePath;
    return this.requestJson<Commit>(path);
  }

  // --- Threads (v2) ---

  public async postThreadsQuery(body: PostThreadsQueryBody): Promise<ThreadsQueryResponse> {
    return this.postJson<ThreadsQueryResponse>(
      "/v2/threads/query",
      body as unknown as Record<string, unknown>
    );
  }

  public async getThreadTraces(
    threadId: string,
    params: { session_id: string; limit?: number; cursor?: string }
  ): Promise<unknown[]> {
    const q = new URLSearchParams();
    q.set("session_id", params.session_id);
    if (params.limit != null) q.set("limit", String(params.limit));
    if (params.cursor != null) q.set("cursor", params.cursor);
    const data = await this.requestJson<unknown>(
      `/v2/threads/${encodeURIComponent(threadId)}/traces?${q.toString()}`
    );
    return Array.isArray(data) ? data : [];
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

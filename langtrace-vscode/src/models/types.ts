export type RunStatus = "success" | "error" | "pending";

/** Sessions = Projects (LangSmith) */
export interface TracerSession {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  modified_at: string;
  run_count?: number;
  latency_p50?: number;
  latency_p99?: number;
  total_tokens?: number;
  error_rate?: number;
  tenant_id: string;
}

export interface Run {
  id: string;
  name: string;
  run_type: string;
  status?: "success" | "error" | "pending";
  start_time: string;
  end_time?: string;
  error?: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  parent_run_id?: string;
  child_run_ids?: string[];
  session_id: string;
  tags?: string[];
  feedback_stats?: Record<string, unknown>;
  trace_id?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  modified_at: string;
  example_count?: number;
  tenant_id: string;
  data_type?: string;
}

export interface Example {
  id: string;
  dataset_id: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  created_at: string;
  modified_at: string;
  metadata?: Record<string, unknown>;
}

export interface Feedback {
  id: string;
  run_id: string;
  key: string;
  score?: number;
  value?: unknown;
  comment?: string;
  created_at: string;
}

export interface Repo {
  id: string;
  repo_handle: string;
  description?: string;
  owner: string;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  num_commits?: number;
  latest_commit_hash?: string;
}

export interface Commit {
  commit_hash: string;
  parent_id?: string;
  created_at: string;
  manifest: Record<string, unknown>;
  tags?: string[];
}

export interface Thread {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  run_count?: number;
}

/** POST /api/v1/runs/query and POST /api/v1/runs/stats body (RunStatsQueryParams) */
export interface RunsQueryBody {
  session_id?: string[];
  run_type?: string;
  error?: boolean;
  start_time?: string;
  end_time?: string;
  filter?: string;
  limit?: number;
  cursor?: string;
  select?: string[];
  trace_id?: string;
  parent_run?: boolean;
  id?: string[];
}

export interface PostFeedbackBody {
  run_id: string;
  key: string;
  score?: number;
  value?: unknown;
  comment?: string;
  source_info?: Record<string, unknown>;
  feedback_source_type?: string;
}

export interface PostDatasetRunsBody {
  session_ids: string[];
  limit?: number;
}

export interface PostThreadsQueryBody {
  session_id: string;
  cursor?: string;
  limit?: number;
  min_start_time?: string;
  max_start_time?: string;
}

export interface RunsQueryResponse {
  runs: Run[];
  cursor?: string;
}

export interface ThreadsQueryResponse {
  threads: Thread[];
  cursor?: string;
}

export interface ExamplesCountResponse {
  count: number;
}

export interface ReposListResponse {
  repos: Repo[];
  total: number;
}

/** Extension / tree UI: nullable/optional fields for placeholders; latency/project_id for list/tree UI */
export type LangSmithProject = TracerSession;
export type LangSmithRun = Omit<
  Run,
  | "session_id"
  | "inputs"
  | "outputs"
  | "end_time"
  | "error"
  | "tags"
  | "child_run_ids"
  | "parent_run_id"
  | "prompt_tokens"
  | "completion_tokens"
  | "total_tokens"
> & {
  session_id?: string;
  inputs?: Record<string, unknown> | null;
  outputs?: Record<string, unknown> | null;
  end_time?: string | null;
  error?: string | null;
  tags?: string[] | null;
  child_run_ids?: string[] | null;
  parent_run_id?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  latency?: number | null;
  project_id?: string | null;
};
export type LangSmithDataset = Dataset;

/** Recursive trace tree: root run plus children. */
export interface LangSmithTrace {
  root: LangSmithRun;
  children: LangSmithTrace[];
}

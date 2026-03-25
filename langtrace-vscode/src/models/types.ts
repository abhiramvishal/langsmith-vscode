export type RunStatus = "success" | "error" | "pending";

export interface LangSmithProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  run_count: number;
}

export interface LangSmithRun {
  id: string;
  name: string;
  run_type: string;
  status: RunStatus | string;
  start_time: string;
  end_time: string | null;
  latency: number | null;
  total_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  error: string | null;
  inputs: unknown;
  outputs: unknown;
  tags: string[] | null;
  project_id: string | null;
  child_run_ids: string[] | null;
  parent_run_id: string | null;
}

// Recursive trace tree: root run plus children.
export interface LangSmithTrace {
  root: LangSmithRun;
  children: LangSmithTrace[];
}

export interface LangSmithDataset {
  id: string;
  name: string;
  description: string;
  created_at: string;
  example_count: number;
  data_type: string;
}


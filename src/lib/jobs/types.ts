import type { JobStatus } from "@/constants/jobs";

/** The PostgreSQL-backed job queue (AGENTS.md §17). No Redis; the table is the queue. */
export type { JobStatus };

export interface CreateJobDTO {
  type: string;
  payload?: Record<string, unknown>;
  /** When the job becomes eligible to run; now, unless given. */
  run_at?: string;
}

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
}

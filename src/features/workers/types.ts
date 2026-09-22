export interface CreateJobDTO {
  type: string;
  payload?: Record<string, any>;
  run_at?: string;
}

export interface Job {
  id: string;
  type: string;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
}

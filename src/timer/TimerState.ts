export interface TimeEntry {
  id: string;           // UUID
  taskName: string;
  customer: string;
  startTime: string;    // ISO string
  endTime?: string;     // Undefined = active session
  duration?: number;    // Milliseconds, set on stop
  tags?: string[];
  notes?: string;
  synced: boolean;
}

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  activeEntry?: TimeEntry;
}

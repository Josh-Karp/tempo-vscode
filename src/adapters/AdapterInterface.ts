import { TimeEntry } from '../timer/TimerState';

export interface SyncResult {
  success: boolean;
  remoteId?: string;
  error?: string;
}

export interface TimeTrackingAdapter {
  name: string;
  sync(entry: TimeEntry): Promise<SyncResult>;
  syncBatch(entries: TimeEntry[]): Promise<SyncResult[]>;
  testConnection(): Promise<boolean>;
}

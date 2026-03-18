import { TimeTrackingAdapter, SyncResult } from './AdapterInterface';
import { TimeEntry } from '../timer/TimerState';

export class NoOpAdapter implements TimeTrackingAdapter {
  name = 'none';

  async sync(_entry: TimeEntry): Promise<SyncResult> {
    return { success: true };
  }

  async syncBatch(entries: TimeEntry[]): Promise<SyncResult[]> {
    return entries.map(() => ({ success: true }));
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

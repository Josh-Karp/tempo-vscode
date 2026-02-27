import * as vscode from 'vscode';
import { TimeEntry } from '../timer/TimerState';

const ENTRIES_KEY = 'tempo.entries';

export class LocalStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getEntries(): TimeEntry[] {
    return this.context.globalState.get<TimeEntry[]>(ENTRIES_KEY) ?? [];
  }

  async saveEntry(entry: TimeEntry): Promise<void> {
    const entries = this.getEntries();
    const index = entries.findIndex(e => e.id === entry.id);
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    await this.context.globalState.update(ENTRIES_KEY, entries);
  }

  async deleteEntry(id: string): Promise<void> {
    const entries = this.getEntries().filter(e => e.id !== id);
    await this.context.globalState.update(ENTRIES_KEY, entries);
  }

  async clearAll(): Promise<void> {
    await this.context.globalState.update(ENTRIES_KEY, []);
  }
}

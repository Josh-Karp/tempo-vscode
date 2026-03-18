import { TimeEntry } from '../../timer/TimerState';

/**
 * Lightweight in-memory store that mirrors the LocalStore interface.
 * Used in unit tests to avoid the vscode.ExtensionContext dependency.
 */
export class InMemoryStore {
  private entries: TimeEntry[] = [];

  getEntries(): TimeEntry[] {
    return this.entries;
  }

  async saveEntry(entry: TimeEntry): Promise<void> {
    const idx = this.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
    }
  }

  async deleteEntry(id: string): Promise<void> {
    this.entries = this.entries.filter((e) => e.id !== id);
  }

  async clearAll(): Promise<void> {
    this.entries = [];
  }
}

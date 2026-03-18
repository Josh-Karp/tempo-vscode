import { LocalStore } from './LocalStore';
import { TimeEntry } from '../timer/TimerState';

export class EntryRepository {
  constructor(private readonly store: LocalStore) {}

  getAll(): TimeEntry[] {
    return this.store.getEntries();
  }

  getById(id: string): TimeEntry | undefined {
    return this.store.getEntries().find((e) => e.id === id);
  }

  getUnsynced(): TimeEntry[] {
    return this.store.getEntries().filter((e) => !e.synced && e.endTime !== undefined);
  }

  getActive(): TimeEntry | undefined {
    return this.store.getEntries().find((e) => e.endTime === undefined);
  }

  async save(entry: TimeEntry): Promise<void> {
    await this.store.saveEntry(entry);
  }

  async delete(id: string): Promise<void> {
    await this.store.deleteEntry(id);
  }

  getRecentCustomers(limit = 10): string[] {
    const entries = this.store.getEntries();
    const seen = new Set<string>();
    const customers: string[] = [];
    for (let i = entries.length - 1; i >= 0 && customers.length < limit; i--) {
      const customer = entries[i].customer;
      if (!seen.has(customer)) {
        seen.add(customer);
        customers.push(customer);
      }
    }
    return customers;
  }
}

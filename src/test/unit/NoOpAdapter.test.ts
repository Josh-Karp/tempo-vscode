import { NoOpAdapter } from '../../adapters/NoOpAdapter';
import { TimeEntry } from '../../timer/TimerState';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'test-id',
    taskName: 'Test Task',
    customer: 'ACME',
    startTime: new Date().toISOString(),
    synced: false,
    ...overrides,
  };
}

describe('NoOpAdapter', () => {
  let adapter: NoOpAdapter;

  beforeEach(() => {
    adapter = new NoOpAdapter();
  });

  it('has name "none"', () => {
    expect(adapter.name).toBe('none');
  });

  it('sync returns success', async () => {
    const result = await adapter.sync(makeEntry());
    expect(result.success).toBe(true);
  });

  it('sync does not return an error', async () => {
    const result = await adapter.sync(makeEntry());
    expect(result.error).toBeUndefined();
  });

  it('syncBatch returns success for every entry', async () => {
    const entries = [makeEntry({ id: '1' }), makeEntry({ id: '2' }), makeEntry({ id: '3' })];
    const results = await adapter.syncBatch(entries);
    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.success).toBe(true));
  });

  it('syncBatch returns empty array for empty input', async () => {
    const results = await adapter.syncBatch([]);
    expect(results).toEqual([]);
  });

  it('testConnection always returns true', async () => {
    expect(await adapter.testConnection()).toBe(true);
  });
});

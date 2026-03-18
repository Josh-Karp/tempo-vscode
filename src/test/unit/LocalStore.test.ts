import { LocalStore } from '../../storage/LocalStore';
import { TimeEntry } from '../../timer/TimerState';

/** Creates a lightweight mock for vscode.ExtensionContext.globalState */
function makeGlobalState() {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(
      <T>(key: string, defaultValue?: T): T =>
        store.has(key) ? (store.get(key) as T) : (defaultValue as T),
    ),
    update: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    keys: jest.fn(() => [...store.keys()]),
    setKeysForSync: jest.fn(),
  };
}

function makeContext() {
  return { globalState: makeGlobalState() } as unknown as import('vscode').ExtensionContext;
}

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    taskName: 'Write tests',
    customer: 'ACME',
    startTime: '2024-01-01T09:00:00.000Z',
    synced: false,
    ...overrides,
  };
}

describe('LocalStore', () => {
  let store: LocalStore;
  let context: ReturnType<typeof makeContext>;

  beforeEach(() => {
    context = makeContext();
    store = new LocalStore(context);
  });

  describe('getEntries', () => {
    it('returns empty array when nothing is stored', () => {
      expect(store.getEntries()).toEqual([]);
    });
  });

  describe('saveEntry', () => {
    it('persists a new entry', async () => {
      const entry = makeEntry();
      await store.saveEntry(entry);
      expect(store.getEntries()).toHaveLength(1);
      expect(store.getEntries()[0]).toEqual(entry);
    });

    it('updates an existing entry by id', async () => {
      const entry = makeEntry();
      await store.saveEntry(entry);
      const updated = { ...entry, taskName: 'Updated Task' };
      await store.saveEntry(updated);
      const all = store.getEntries();
      expect(all).toHaveLength(1);
      expect(all[0].taskName).toBe('Updated Task');
    });

    it('appends when entries have different ids', async () => {
      await store.saveEntry(makeEntry({ id: 'a' }));
      await store.saveEntry(makeEntry({ id: 'b' }));
      expect(store.getEntries()).toHaveLength(2);
    });
  });

  describe('deleteEntry', () => {
    it('removes the entry with the given id', async () => {
      await store.saveEntry(makeEntry({ id: 'x' }));
      await store.saveEntry(makeEntry({ id: 'y' }));
      await store.deleteEntry('x');
      const all = store.getEntries();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('y');
    });

    it('does nothing when id does not exist', async () => {
      await store.saveEntry(makeEntry({ id: 'z' }));
      await store.deleteEntry('unknown');
      expect(store.getEntries()).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('removes all entries', async () => {
      await store.saveEntry(makeEntry({ id: '1' }));
      await store.saveEntry(makeEntry({ id: '2' }));
      await store.clearAll();
      expect(store.getEntries()).toEqual([]);
    });
  });
});

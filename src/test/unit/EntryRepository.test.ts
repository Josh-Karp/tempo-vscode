import { EntryRepository } from '../../storage/EntryRepository';
import { TimeEntry } from '../../timer/TimerState';
import { InMemoryStore } from './helpers';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'default-id',
    taskName: 'Task',
    customer: 'Cust',
    startTime: '2024-01-01T10:00:00.000Z',
    synced: false,
    ...overrides,
  };
}

describe('EntryRepository', () => {
  let repo: EntryRepository;
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
    // Cast to satisfy the constructor parameter type
    repo = new EntryRepository(store as unknown as import('../../storage/LocalStore').LocalStore);
  });

  describe('getAll', () => {
    it('returns empty array when store is empty', () => {
      expect(repo.getAll()).toEqual([]);
    });

    it('returns all saved entries', async () => {
      await repo.save(makeEntry({ id: 'a' }));
      await repo.save(makeEntry({ id: 'b' }));
      expect(repo.getAll()).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('returns the matching entry', async () => {
      const entry = makeEntry({ id: 'x' });
      await repo.save(entry);
      expect(repo.getById('x')).toEqual(entry);
    });

    it('returns undefined for unknown id', () => {
      expect(repo.getById('nope')).toBeUndefined();
    });
  });

  describe('getUnsynced', () => {
    it('returns only completed, unsynced entries', async () => {
      await repo.save(makeEntry({ id: '1', synced: false, endTime: '2024-01-01T11:00:00.000Z' }));
      await repo.save(makeEntry({ id: '2', synced: true, endTime: '2024-01-01T11:00:00.000Z' }));
      await repo.save(makeEntry({ id: '3', synced: false })); // active — no endTime
      expect(repo.getUnsynced()).toHaveLength(1);
      expect(repo.getUnsynced()[0].id).toBe('1');
    });
  });

  describe('getActive', () => {
    it('returns the entry without an endTime', async () => {
      await repo.save(makeEntry({ id: 'done', endTime: '2024-01-01T11:00:00.000Z' }));
      await repo.save(makeEntry({ id: 'active' })); // no endTime
      expect(repo.getActive()?.id).toBe('active');
    });

    it('returns undefined when no active entry', async () => {
      await repo.save(makeEntry({ id: 'done', endTime: '2024-01-01T11:00:00.000Z' }));
      expect(repo.getActive()).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('removes the entry from the store', async () => {
      await repo.save(makeEntry({ id: 'del' }));
      await repo.delete('del');
      expect(repo.getById('del')).toBeUndefined();
    });
  });

  describe('getRecentCustomers', () => {
    it('returns unique customers in reverse-insertion order', async () => {
      await repo.save(makeEntry({ id: '1', customer: 'Alpha' }));
      await repo.save(makeEntry({ id: '2', customer: 'Beta' }));
      await repo.save(makeEntry({ id: '3', customer: 'Alpha' })); // duplicate
      const recent = repo.getRecentCustomers();
      expect(recent).toEqual(['Alpha', 'Beta']);
    });

    it('respects the limit parameter', async () => {
      for (let i = 0; i < 15; i++) {
        await repo.save(makeEntry({ id: `e${i}`, customer: `Customer${i}` }));
      }
      expect(repo.getRecentCustomers(5)).toHaveLength(5);
    });

    it('returns empty array when store is empty', () => {
      expect(repo.getRecentCustomers()).toEqual([]);
    });
  });
});

import { TimerService } from '../../timer/TimerService';
import { EntryRepository } from '../../storage/EntryRepository';
import { TimeTrackingAdapter, SyncResult } from '../../adapters/AdapterInterface';
import { TimeEntry } from '../../timer/TimerState';
import { window as vscodeWindow, workspace as vscodeWorkspace } from 'vscode';
import { InMemoryStore } from './helpers';

// The vscode module is automatically resolved from src/__mocks__/vscode.ts
// via the moduleNameMapper in jest.config.js.

function makeAdapter(overrides: Partial<TimeTrackingAdapter> = {}): TimeTrackingAdapter {
  return {
    name: 'mock',
    sync: jest.fn<Promise<SyncResult>, [TimeEntry]>().mockResolvedValue({ success: true }),
    syncBatch: jest.fn<Promise<SyncResult[]>, [TimeEntry[]]>().mockResolvedValue([]),
    testConnection: jest.fn<Promise<boolean>, []>().mockResolvedValue(true),
    ...overrides,
  };
}

describe('TimerService', () => {
  let repo: EntryRepository;
  let adapter: TimeTrackingAdapter;
  let service: TimerService;

  beforeEach(() => {
    jest.clearAllMocks();
    const store = new InMemoryStore();
    repo = new EntryRepository(store as unknown as import('../../storage/LocalStore').LocalStore);
    adapter = makeAdapter();
    service = new TimerService(repo, adapter);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts idle', () => {
      expect(service.getStatus()).toBe('idle');
    });

    it('has no active entry', () => {
      expect(service.getActiveEntry()).toBeUndefined();
    });

    it('reports 0 elapsed ms when idle', () => {
      expect(service.getElapsedMs()).toBe(0);
    });
  });

  // ── start ──────────────────────────────────────────────────────────────────

  describe('start', () => {
    it('transitions to running status', async () => {
      await service.start('Task A', 'ACME');
      expect(service.getStatus()).toBe('running');
    });

    it('sets the active entry with correct task and customer', async () => {
      await service.start('Task A', 'ACME');
      const entry = service.getActiveEntry();
      expect(entry?.taskName).toBe('Task A');
      expect(entry?.customer).toBe('ACME');
    });

    it('persists the entry in the repository', async () => {
      await service.start('Task A', 'ACME');
      expect(repo.getAll()).toHaveLength(1);
    });

    it('stores optional notes on the entry', async () => {
      await service.start('Task A', 'ACME', 'some notes');
      expect(service.getActiveEntry()?.notes).toBe('some notes');
    });

    it('throws when already running', async () => {
      await service.start('Task A', 'ACME');
      await expect(service.start('Task B', 'ACME')).rejects.toThrow();
    });

    it('throws when paused', async () => {
      await service.start('Task A', 'ACME');
      service.pause();
      await expect(service.start('Task B', 'ACME')).rejects.toThrow();
    });
  });

  // ── stop ───────────────────────────────────────────────────────────────────

  describe('stop', () => {
    it('returns undefined when idle', async () => {
      expect(await service.stop()).toBeUndefined();
    });

    it('transitions back to idle', async () => {
      await service.start('Task A', 'ACME');
      await service.stop();
      expect(service.getStatus()).toBe('idle');
    });

    it('sets endTime on the returned entry', async () => {
      await service.start('Task A', 'ACME');
      const entry = await service.stop();
      expect(entry?.endTime).toBeDefined();
    });

    it('computes a positive duration', async () => {
      await service.start('Task A', 'ACME');
      const entry = await service.stop();
      expect(entry?.duration).toBeGreaterThanOrEqual(0);
    });

    it('marks entry as synced when adapter succeeds and autoSync is on', async () => {
      (vscodeWorkspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest
          .fn()
          .mockImplementation((key: string, def: unknown) =>
            key === 'autoSyncOnStop' ? true : def,
          ),
      });
      await service.start('Task A', 'ACME');
      const entry = await service.stop();
      expect(entry?.synced).toBe(true);
      expect(adapter.sync).toHaveBeenCalledTimes(1);
    });

    it('does not sync when autoSync is off', async () => {
      (vscodeWorkspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(false),
      });
      await service.start('Task A', 'ACME');
      await service.stop();
      expect(adapter.sync).not.toHaveBeenCalled();
    });

    it('keeps synced=false when adapter reports failure', async () => {
      (vscodeWorkspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(true),
      });
      adapter = makeAdapter({
        sync: jest
          .fn<Promise<SyncResult>, [TimeEntry]>()
          .mockResolvedValue({ success: false, error: 'nope' }),
      });
      service = new TimerService(repo, adapter);
      await service.start('Task A', 'ACME');
      const entry = await service.stop();
      expect(entry?.synced).toBe(false);
    });
  });

  // ── pause / resume ─────────────────────────────────────────────────────────

  describe('pause', () => {
    it('transitions to paused', async () => {
      await service.start('Task A', 'ACME');
      service.pause();
      expect(service.getStatus()).toBe('paused');
    });

    it('is a no-op when idle', () => {
      service.pause();
      expect(service.getStatus()).toBe('idle');
    });

    it('is a no-op when already paused', async () => {
      await service.start('Task A', 'ACME');
      service.pause();
      service.pause(); // second call
      expect(service.getStatus()).toBe('paused');
    });
  });

  describe('resume', () => {
    it('transitions back to running', async () => {
      await service.start('Task A', 'ACME');
      service.pause();
      service.resume();
      expect(service.getStatus()).toBe('running');
    });

    it('is a no-op when already running', async () => {
      await service.start('Task A', 'ACME');
      service.resume(); // not paused
      expect(service.getStatus()).toBe('running');
    });

    it('is a no-op when idle', () => {
      service.resume();
      expect(service.getStatus()).toBe('idle');
    });

    it('excludes paused time from elapsed ms', async () => {
      await service.start('Task A', 'ACME');
      await new Promise((r) => setTimeout(r, 20));
      service.pause();
      const elapsedAtPause = service.getElapsedMs();
      await new Promise((r) => setTimeout(r, 30)); // time passes while paused
      service.resume();
      const elapsedAfterResume = service.getElapsedMs();
      // Elapsed should not have grown significantly during the pause
      expect(elapsedAfterResume).toBeLessThan(elapsedAtPause + 15);
    });
  });

  // ── getElapsedMs ───────────────────────────────────────────────────────────

  describe('getElapsedMs', () => {
    it('returns 0 when idle', () => {
      expect(service.getElapsedMs()).toBe(0);
    });

    it('grows while running', async () => {
      await service.start('Task A', 'ACME');
      const t1 = service.getElapsedMs();
      await new Promise((r) => setTimeout(r, 20));
      const t2 = service.getElapsedMs();
      expect(t2).toBeGreaterThan(t1);
    });

    it('does not grow while paused', async () => {
      await service.start('Task A', 'ACME');
      service.pause();
      const t1 = service.getElapsedMs();
      await new Promise((r) => setTimeout(r, 20));
      const t2 = service.getElapsedMs();
      expect(t2).toBe(t1);
    });
  });

  // ── recoverActiveSession ───────────────────────────────────────────────────

  describe('recoverActiveSession', () => {
    it('returns undefined when no active entry exists', async () => {
      expect(await service.recoverActiveSession()).toBeUndefined();
    });

    it('resumes the session when user chooses Resume', async () => {
      await repo.save({
        id: 'active-1',
        taskName: 'Old Task',
        customer: 'Beta',
        startTime: '2024-01-01T09:00:00.000Z',
        synced: false,
      });
      (vscodeWindow.showInformationMessage as jest.Mock).mockResolvedValue('Resume');
      const entry = await service.recoverActiveSession();
      expect(entry?.id).toBe('active-1');
      expect(service.getStatus()).toBe('running');
    });

    it('discards the session when user chooses Discard', async () => {
      await repo.save({
        id: 'active-2',
        taskName: 'Old Task',
        customer: 'Beta',
        startTime: '2024-01-01T09:00:00.000Z',
        synced: false,
      });
      (vscodeWindow.showInformationMessage as jest.Mock).mockResolvedValue('Discard');
      const entry = await service.recoverActiveSession();
      expect(entry).toBeUndefined();
      expect(repo.getAll()).toHaveLength(0);
    });
  });
});

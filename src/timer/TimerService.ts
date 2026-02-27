import * as vscode from 'vscode';
import { TimeEntry, TimerState, TimerStatus } from './TimerState';
import { EntryRepository } from '../storage/EntryRepository';
import { TimeTrackingAdapter } from '../adapters/AdapterInterface';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class TimerService {
  private state: TimerState = { status: 'idle' };
  private pausedDuration = 0;
  private pauseStart?: number;

  constructor(
    private readonly repository: EntryRepository,
    private readonly adapter: TimeTrackingAdapter,
  ) {}

  getState(): TimerState {
    return { ...this.state };
  }

  getStatus(): TimerStatus {
    return this.state.status;
  }

  getActiveEntry(): TimeEntry | undefined {
    return this.state.activeEntry ? { ...this.state.activeEntry } : undefined;
  }

  async start(taskName: string, customer: string, notes?: string): Promise<void> {
    if (this.state.status !== 'idle') {
      throw new Error('Timer is already running or paused. Stop or resume first.');
    }

    const entry: TimeEntry = {
      id: generateId(),
      taskName,
      customer,
      startTime: new Date().toISOString(),
      synced: false,
      notes,
    };

    await this.repository.save(entry);
    this.state = { status: 'running', activeEntry: entry };
    this.pausedDuration = 0;
    this.pauseStart = undefined;
  }

  async stop(): Promise<TimeEntry | undefined> {
    if (this.state.status === 'idle' || !this.state.activeEntry) {
      return undefined;
    }

    const entry = { ...this.state.activeEntry };
    const endTime = new Date();
    entry.endTime = endTime.toISOString();

    const startMs = new Date(entry.startTime).getTime();
    const totalElapsed = endTime.getTime() - startMs;
    entry.duration = totalElapsed - this.pausedDuration;
    entry.synced = false;

    await this.repository.save(entry);
    this.state = { status: 'idle' };
    this.pausedDuration = 0;
    this.pauseStart = undefined;

    const config = vscode.workspace.getConfiguration('tempo');
    const autoSync = config.get<boolean>('autoSyncOnStop', true);
    if (autoSync) {
      try {
        const result = await this.adapter.sync(entry);
        if (result.success) {
          entry.synced = true;
          await this.repository.save(entry);
        }
      } catch {
        // Sync failure is non-fatal; entry remains unsynced
      }
    }

    return entry;
  }

  pause(): void {
    if (this.state.status !== 'running') {
      return;
    }
    this.pauseStart = Date.now();
    this.state = { ...this.state, status: 'paused' };
  }

  resume(): void {
    if (this.state.status !== 'paused') {
      return;
    }
    if (this.pauseStart !== undefined) {
      this.pausedDuration += Date.now() - this.pauseStart;
      this.pauseStart = undefined;
    }
    this.state = { ...this.state, status: 'running' };
  }

  async recoverActiveSession(): Promise<TimeEntry | undefined> {
    const activeEntry = this.repository.getActive();
    if (!activeEntry) {
      return undefined;
    }

    const choice = await vscode.window.showInformationMessage(
      `Tempo: Found an active timer for "${activeEntry.taskName}" (${activeEntry.customer}). Resume or discard?`,
      'Resume',
      'Discard',
    );

    if (choice === 'Resume') {
      this.state = { status: 'running', activeEntry };
      return activeEntry;
    } else {
      await this.repository.delete(activeEntry.id);
      return undefined;
    }
  }

  getElapsedMs(): number {
    if (this.state.status === 'idle' || !this.state.activeEntry) {
      return 0;
    }
    const startMs = new Date(this.state.activeEntry.startTime).getTime();
    const now = this.state.status === 'paused' && this.pauseStart !== undefined
      ? this.pauseStart
      : Date.now();
    return now - startMs - this.pausedDuration;
  }
}

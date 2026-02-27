import * as vscode from 'vscode';
import { TimerService } from '../timer/TimerService';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(v => String(v).padStart(2, '0'))
    .join(':');
}

export class TempoStatusBarItem {
  private readonly item: vscode.StatusBarItem;
  private interval?: ReturnType<typeof setInterval>;

  constructor(private readonly timerService: TimerService) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'tempo.startTimer';
    this.item.text = '$(clock) Tempo';
    this.item.tooltip = 'Tempo Time Tracker';
    this.item.show();
    this.startUpdating();
  }

  private startUpdating(): void {
    this.interval = setInterval(() => this.update(), 1000);
    this.update();
  }

  update(): void {
    const status = this.timerService.getStatus();
    const entry = this.timerService.getActiveEntry();
    const elapsed = this.timerService.getElapsedMs();

    if (status === 'running' && entry) {
      this.item.text = `$(clock) ${entry.taskName} (${entry.customer}) — ${formatDuration(elapsed)}`;
      this.item.color = new vscode.ThemeColor('terminal.ansiGreen');
      this.item.backgroundColor = undefined;
    } else if (status === 'paused' && entry) {
      this.item.text = `$(clock) ${entry.taskName} (${entry.customer}) — ${formatDuration(elapsed)} ⏸`;
      this.item.color = new vscode.ThemeColor('terminal.ansiYellow');
      this.item.backgroundColor = undefined;
    } else {
      this.item.text = '$(clock) Tempo';
      this.item.color = undefined;
      this.item.backgroundColor = undefined;
    }
  }

  dispose(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.item.dispose();
  }
}

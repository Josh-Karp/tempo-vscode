import * as vscode from 'vscode';
import { TimerService } from '../timer/TimerService';
import { EntryRepository } from '../storage/EntryRepository';
import { TempoStatusBarItem } from '../ui/StatusBarItem';
import { promptTimerStart } from '../ui/QuickPick';
import { HistoryPanel } from '../ui/HistoryPanel';
import { TimeEntry } from '../timer/TimerState';

function formatCsvRow(entry: TimeEntry): string {
  const fields = [
    entry.id,
    entry.customer,
    entry.taskName,
    entry.startTime,
    entry.endTime ?? '',
    entry.duration !== undefined ? String(entry.duration) : '',
    entry.synced ? 'true' : 'false',
    entry.notes ?? '',
    (entry.tags ?? []).join(';'),
  ];
  return fields.map((f) => `"${f.replace(/"/g, '""')}"`).join(',');
}

export function registerCommands(
  context: vscode.ExtensionContext,
  timerService: TimerService,
  repository: EntryRepository,
  statusBarItem: TempoStatusBarItem,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('tempo.startTimer', async () => {
      const input = await promptTimerStart(repository);
      if (!input) {
        return;
      }
      try {
        await timerService.start(input.taskName, input.customer, input.notes);
        statusBarItem.update();
        vscode.window.showInformationMessage(
          `Tempo: Timer started for "${input.taskName}" (${input.customer})`,
        );
      } catch (err) {
        vscode.window.showErrorMessage(`Tempo: ${String(err)}`);
      }
    }),

    vscode.commands.registerCommand('tempo.stopTimer', async () => {
      const entry = await timerService.stop();
      statusBarItem.update();
      if (entry) {
        vscode.window.showInformationMessage(
          `Tempo: Timer stopped. Duration: ${entry.duration !== undefined ? Math.round(entry.duration / 60000) + ' min' : 'unknown'}`,
        );
      } else {
        vscode.window.showWarningMessage('Tempo: No active timer to stop.');
      }
    }),

    vscode.commands.registerCommand('tempo.pauseTimer', () => {
      timerService.pause();
      statusBarItem.update();
      vscode.window.showInformationMessage('Tempo: Timer paused.');
    }),

    vscode.commands.registerCommand('tempo.resumeTimer', () => {
      timerService.resume();
      statusBarItem.update();
      vscode.window.showInformationMessage('Tempo: Timer resumed.');
    }),

    vscode.commands.registerCommand('tempo.openHistory', () => {
      HistoryPanel.createOrShow(repository, context.extensionUri);
    }),

    vscode.commands.registerCommand('tempo.exportEntries', async () => {
      const entries = repository.getAll();
      if (entries.length === 0) {
        vscode.window.showWarningMessage('Tempo: No entries to export.');
        return;
      }
      const header =
        '"id","customer","taskName","startTime","endTime","duration","synced","notes","tags"';
      const rows = entries.map(formatCsvRow);
      const csv = [header, ...rows].join('\n');

      const uri = await vscode.window.showSaveDialog({
        filters: { 'CSV Files': ['csv'] },
        defaultUri: vscode.Uri.file('tempo-export.csv'),
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf-8'));
        vscode.window.showInformationMessage(
          `Tempo: Exported ${entries.length} entries to ${uri.fsPath}`,
        );
      }
    }),
  );
}

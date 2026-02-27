import * as vscode from 'vscode';
import * as path from 'path';
import { EntryRepository } from '../storage/EntryRepository';
import { TimeEntry } from '../timer/TimerState';

function formatDuration(ms?: number): string {
  if (ms === undefined) {
    return '—';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(v => String(v).padStart(2, '0'))
    .join(':');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTableRows(entries: TimeEntry[]): string {
  if (entries.length === 0) {
    return `<tr><td colspan="5" class="empty">No time entries yet. Start a timer to begin!</td></tr>`;
  }
  return [...entries].reverse().map(entry => `
    <tr>
      <td>${escapeHtml(new Date(entry.startTime).toLocaleDateString())}</td>
      <td>${escapeHtml(entry.customer)}</td>
      <td>${escapeHtml(entry.taskName)}</td>
      <td>${formatDuration(entry.duration)}</td>
      <td><span class="badge ${entry.synced ? 'synced' : (entry.endTime ? 'unsynced' : 'active')}">${entry.synced ? 'Synced' : (entry.endTime ? 'Unsynced' : 'Active')}</span></td>
    </tr>
  `).join('');
}

export class HistoryPanel {
  public static currentPanel: HistoryPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly repository: EntryRepository,
    private readonly extensionUri: vscode.Uri,
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.update();
  }

  static createOrShow(repository: EntryRepository, extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel.panel.reveal(column);
      HistoryPanel.currentPanel.update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'tempoHistory',
      'Tempo History',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview')],
      },
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, repository, extensionUri);
  }

  update(): void {
    const entries = this.repository.getAll();
    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'history.css'),
    );
    this.panel.webview.html = this.getHtml(entries, cssUri);
  }

  private getHtml(entries: TimeEntry[], cssUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource};">
  <link rel="stylesheet" href="${cssUri}">
  <title>Tempo History</title>
</head>
<body>
  <h1>Time Entry History</h1>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Customer</th>
        <th>Task</th>
        <th>Duration</th>
        <th>Sync Status</th>
      </tr>
    </thead>
    <tbody>
      ${buildTableRows(entries)}
    </tbody>
  </table>
</body>
</html>`;
  }

  dispose(): void {
    HistoryPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

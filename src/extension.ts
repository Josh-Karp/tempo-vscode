import * as vscode from 'vscode';
import { TimerService } from './timer/TimerService';
import { LocalStore } from './storage/LocalStore';
import { EntryRepository } from './storage/EntryRepository';
import { NoOpAdapter } from './adapters/NoOpAdapter';
import { WebhookAdapter } from './adapters/WebhookAdapter';
import { TimeTrackingAdapter } from './adapters/AdapterInterface';
import { TempoStatusBarItem } from './ui/StatusBarItem';
import { registerCommands } from './commands/index';

function createAdapter(): TimeTrackingAdapter {
  const config = vscode.workspace.getConfiguration('tempo');
  const adapterType = config.get<string>('adapter', 'none');

  if (adapterType === 'webhook') {
    const url = config.get<string>('webhook.url', '');
    const token = config.get<string>('webhook.token', '');
    return new WebhookAdapter(url, token);
  }

  return new NoOpAdapter();
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const store = new LocalStore(context);
  const repository = new EntryRepository(store);
  const adapter = createAdapter();
  const timerService = new TimerService(repository, adapter);
  const statusBarItem = new TempoStatusBarItem(timerService);

  context.subscriptions.push({ dispose: () => statusBarItem.dispose() });

  registerCommands(context, timerService, repository, statusBarItem);

  // Check for an active session from a previous run
  await timerService.recoverActiveSession();

  // Re-create adapter when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('tempo.adapter') ||
        e.affectsConfiguration('tempo.webhook.url') ||
        e.affectsConfiguration('tempo.webhook.token')
      ) {
        // Note: adapter changes take effect after restart for simplicity
        vscode.window.showInformationMessage(
          'Tempo: Adapter configuration changed. Please reload the window to apply.',
        );
      }
    }),
  );
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}

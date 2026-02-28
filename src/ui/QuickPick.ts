import * as vscode from 'vscode';
import { EntryRepository } from '../storage/EntryRepository';

export interface TimerStartInput {
  customer: string;
  taskName: string;
  notes?: string;
}

export async function promptTimerStart(
  repository: EntryRepository,
): Promise<TimerStartInput | undefined> {
  // Step 1: Select or create customer
  const recentCustomers = repository.getRecentCustomers();
  const config = vscode.workspace.getConfiguration('tempo');
  const defaultCustomer = config.get<string>('defaultCustomer', '');

  const customerItems: vscode.QuickPickItem[] = recentCustomers.map((c) => ({ label: c }));
  if (defaultCustomer && !recentCustomers.includes(defaultCustomer)) {
    customerItems.unshift({ label: defaultCustomer, description: '(default)' });
  }
  customerItems.push({ label: '$(add) New customer...', alwaysShow: true });

  const customerPick = await vscode.window.showQuickPick(customerItems, {
    placeHolder: 'Select or create a customer',
    title: 'Tempo: Step 1 of 3 — Customer',
  });

  if (!customerPick) {
    return undefined;
  }

  let customer: string;
  if (customerPick.label === '$(add) New customer...') {
    const newCustomer = await vscode.window.showInputBox({
      prompt: 'Enter customer name',
      title: 'Tempo: New Customer',
    });
    if (!newCustomer) {
      return undefined;
    }
    customer = newCustomer;
  } else {
    customer = customerPick.label;
  }

  // Step 2: Enter task name
  const taskName = await vscode.window.showInputBox({
    prompt: 'Enter task name',
    title: 'Tempo: Step 2 of 3 — Task Name',
    placeHolder: 'e.g. Fix login bug',
  });

  if (!taskName) {
    return undefined;
  }

  // Step 3 (optional): Notes/tags
  const notes = await vscode.window.showInputBox({
    prompt: 'Add notes or tags (optional)',
    title: 'Tempo: Step 3 of 3 — Notes',
    placeHolder: 'e.g. #bug #frontend (press Escape to skip)',
  });

  return { customer, taskName, notes: notes || undefined };
}

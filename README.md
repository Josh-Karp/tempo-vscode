# Tempo — VSCode Time Tracker

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Marketplace](https://img.shields.io/badge/marketplace-coming%20soon-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

> Track time against tasks and customers directly from VSCode, without leaving your editor.

---

## Features

- ⏱ **Time Tracking** — Start, stop, pause, and resume timers with a single command
- 🔄 **Adapter Sync** — Pluggable adapter system to sync entries to any backend (webhook, API, etc.)
- 📋 **History Panel** — View all time entries in a rich Webview panel with date, customer, task, duration, and sync status
- ⌨ **Keyboard-native** — Every action reachable via the Command Palette
- 🎨 **Theme-aware** — All UI elements use VSCode CSS variables for seamless theming

---

## Getting Started

1. Install the extension from the VSCode Marketplace (or sideload the `.vsix`)
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run **Tempo: Start Timer** and enter a customer and task name
4. The status bar will show the running timer: `⏱ Task (Customer) — HH:MM:SS`
5. Run **Tempo: Stop Timer** to save the entry

---

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `tempo.adapter` | `"none" \| "webhook"` | `"none"` | Sync adapter to use |
| `tempo.webhook.url` | `string` | `""` | Webhook URL for syncing entries |
| `tempo.webhook.token` | `string` | `""` | Auth token for webhook requests |
| `tempo.autoSyncOnStop` | `boolean` | `true` | Auto-sync entries on stop |
| `tempo.idleTimeoutMinutes` | `number` | `30` | Idle timeout in minutes |
| `tempo.defaultCustomer` | `string` | `""` | Default customer name |

---

## Adapter Development

Implement the `TimeTrackingAdapter` interface to create your own sync target:

```typescript
import { TimeTrackingAdapter, SyncResult } from './src/adapters/AdapterInterface';
import { TimeEntry } from './src/timer/TimerState';

export class MyCustomAdapter implements TimeTrackingAdapter {
  name = 'my-adapter';

  async sync(entry: TimeEntry): Promise<SyncResult> {
    // Send entry to your backend
    return { success: true, remoteId: 'remote-id-123' };
  }

  async syncBatch(entries: TimeEntry[]): Promise<SyncResult[]> {
    return Promise.all(entries.map(e => this.sync(e)));
  }

  async testConnection(): Promise<boolean> {
    // Test connectivity to your backend
    return true;
  }
}
```

Register your adapter in `src/extension.ts` and select it via the `tempo.adapter` configuration.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT
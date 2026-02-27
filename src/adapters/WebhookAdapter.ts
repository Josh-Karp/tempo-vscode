import * as https from 'https';
import * as http from 'http';
import { TimeTrackingAdapter, SyncResult } from './AdapterInterface';
import { TimeEntry } from '../timer/TimerState';

export class WebhookAdapter implements TimeTrackingAdapter {
  name = 'webhook';

  constructor(private readonly url: string, private readonly token: string) {}

  async sync(entry: TimeEntry): Promise<SyncResult> {
    try {
      const body = JSON.stringify(entry);
      const remoteId = await this.post(this.url, body);
      return { success: true, remoteId };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async syncBatch(entries: TimeEntry[]): Promise<SyncResult[]> {
    return Promise.all(entries.map(e => this.sync(e)));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.post(this.url, JSON.stringify({ test: true }));
      return true;
    } catch {
      return false;
    }
  }

  private post(url: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
      };
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const statusCode = res.statusCode ?? 0;
          if (statusCode >= 200 && statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

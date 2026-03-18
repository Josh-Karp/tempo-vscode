// This file is compiled separately for the webview context.
// It handles client-side interactions in the history panel.

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

(function () {
  // TODO: Add interactivity such as refresh, filter, and export buttons.
  // The history panel is currently rendered server-side in HistoryPanel.ts.
})();

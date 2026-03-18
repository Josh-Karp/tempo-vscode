/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal mock for the `vscode` module used in unit tests.
 * Tests that need specific behaviour can override individual mocks using jest.spyOn or
 * by reassigning the exported mock functions directly.
 */

const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((_key: string, defaultValue: unknown) => defaultValue),
  }),
  onDidChangeConfiguration: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  fs: {
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
};

const window = {
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showQuickPick: jest.fn().mockResolvedValue(undefined),
  showInputBox: jest.fn().mockResolvedValue(undefined),
  showSaveDialog: jest.fn().mockResolvedValue(undefined),
  createStatusBarItem: jest.fn().mockReturnValue({
    text: '',
    color: undefined,
    backgroundColor: undefined,
    command: undefined,
    tooltip: undefined,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  }),
  createWebviewPanel: jest.fn().mockReturnValue({
    webview: {
      html: '',
      asWebviewUri: jest.fn().mockImplementation((uri: any) => uri),
      cspSource: 'vscode-resource:',
    },
    onDidDispose: jest.fn(),
    reveal: jest.fn(),
    dispose: jest.fn(),
  }),
  activeTextEditor: undefined,
};

const commands = {
  registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  executeCommand: jest.fn().mockResolvedValue(undefined),
};

const StatusBarAlignment = { Left: 1, Right: 2 };
const ViewColumn = { One: 1, Two: 2, Three: 3 };

class ThemeColor {
  constructor(public readonly id: string) {}
}

class Uri {
  private constructor(
    public readonly scheme: string,
    public readonly fsPath: string,
    private readonly _path: string,
  ) {}

  static file(path: string): Uri {
    return new Uri('file', path, path);
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    const joined = [base.fsPath, ...segments].join('/');
    return new Uri(base.scheme, joined, joined);
  }

  toString(): string {
    return this._path;
  }
}

const ExtensionContext = {};

export {
  workspace,
  window,
  commands,
  StatusBarAlignment,
  ViewColumn,
  ThemeColor,
  Uri,
  ExtensionContext,
};

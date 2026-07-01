import * as vscode from "vscode";
import { encode } from "gpt-tokenizer";

/**
 * Conta tokens (BPE cl100k via gpt-tokenizer) do documento Markdown ativo e
 * exibe o total em um item da status bar. Atualiza ao trocar de editor, editar
 * o texto (com debounce) ou mudar a seleção.
 */
export class TokenCounter implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private debounce?: ReturnType<typeof setTimeout>;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "promptMark.refreshTokens";
    this.item.tooltip = "Prompt Mark: tokens do arquivo Markdown (cl100k)";

    this.disposables.push(
      this.item,
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
          this.update();
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.scheduleUpdate();
        }
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("promptMark.enableTokenCount")) {
          this.update();
        }
      })
    );

    this.update();
  }

  /** Recalcula imediatamente (usado pelo comando e por eventos baratos). */
  update(): void {
    const enabled = vscode.workspace
      .getConfiguration("promptMark")
      .get<boolean>("enableTokenCount", true);

    const editor = vscode.window.activeTextEditor;
    const langId = editor?.document.languageId;
    if (!enabled || !editor || (langId !== "markdown" && langId !== "skill")) {
      this.item.hide();
      return;
    }

    const sel = editor.selection;
    if (!sel.isEmpty) {
      const selCount = encode(editor.document.getText(sel)).length;
      const total = encode(editor.document.getText()).length;
      this.item.text = `$(symbol-text) ${fmt(selCount)} / ${fmt(total)} tokens`;
    } else {
      const total = encode(editor.document.getText()).length;
      this.item.text = `$(symbol-text) ${fmt(total)} tokens`;
    }
    this.item.show();
  }

  /** Recalcula com debounce para não tokenizar a cada tecla. */
  private scheduleUpdate(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => this.update(), 300);
  }

  dispose(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

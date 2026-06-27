import * as vscode from "vscode";
import { getConfig, formatFileRef } from "../config";

/**
 * "Copiar caminho como referência @".
 * `uri` vem do menu de contexto do explorer/editor; se ausente, usa o editor ativo.
 */
export async function copyRelativeRef(uri?: vscode.Uri): Promise<void> {
  const target = uri ?? vscode.window.activeTextEditor?.document.uri;
  if (!target) {
    vscode.window.showWarningMessage(
      "Prompt Mark: nenhum arquivo ativo para copiar."
    );
    return;
  }

  const multiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
  const rel = vscode.workspace.asRelativePath(target, multiRoot);

  // Se o editor ativo for este mesmo arquivo e houver seleção, anexa as linhas.
  let anchor = "";
  const editor = vscode.window.activeTextEditor;
  if (
    editor &&
    editor.document.uri.toString() === target.toString() &&
    !editor.selection.isEmpty
  ) {
    const sel = editor.selection;
    const start = sel.start.line + 1; // 1-based
    // Seleção que termina na coluna 0 não inclui visualmente aquela linha.
    let end = sel.end.line + 1;
    if (sel.end.character === 0 && end > start) {
      end -= 1;
    }
    anchor = start === end ? `#L${start}` : `#L${start}-L${end}`;
  }

  const ref = formatFileRef(rel, getConfig().insertFormat, anchor);

  await vscode.env.clipboard.writeText(ref);
  vscode.window.setStatusBarMessage(`Prompt Mark: copiado "${ref}"`, 3000);
}

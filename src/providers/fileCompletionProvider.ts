import * as vscode from "vscode";
import { getConfig, formatFileRef } from "../config";
import { AT_TOKEN } from "../core/patterns";

const DEBOUNCE_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FileCompletionProvider
  implements vscode.CompletionItemProvider
{
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem[] | undefined> {
    const linePrefix = document
      .lineAt(position.line)
      .text.slice(0, position.character);

    const m = AT_TOKEN.exec(linePrefix);
    if (!m) {
      return undefined;
    }
    const query = m[1];

    // Debounce: em digitação rápida o VSCode cancela esta chamada e reinvoca,
    // então só seguimos se ninguém nos cancelou durante a espera.
    await delay(DEBOUNCE_MS);
    if (token.isCancellationRequested) {
      return undefined;
    }

    const cfg = getConfig();
    const uris = await vscode.workspace.findFiles(
      cfg.fileGlob,
      cfg.excludeGlob,
      cfg.maxResults,
      token
    );
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Inclui o nome da raiz só quando há múltiplas (asRelativePath(uri, true)).
    const multiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;

    // Substitui o trecho "@query" inteiro pelo texto formatado.
    const start = position.translate(0, -(query.length + 1));
    const range = new vscode.Range(start, position);

    return uris.map((uri) => {
      const rel = vscode.workspace.asRelativePath(uri, multiRoot);
      const item = new vscode.CompletionItem(
        rel,
        vscode.CompletionItemKind.File
      );
      item.insertText = formatFileRef(rel, cfg.insertFormat);
      item.range = range;
      // O filtro fuzzy compara o texto digitado ("@query") com filterText.
      item.filterText = `@${rel}`;
      const parent = rel.includes("/")
        ? rel.slice(0, rel.lastIndexOf("/"))
        : "";
      item.detail = parent || undefined;
      return item;
    });
  }
}

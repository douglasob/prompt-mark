import * as vscode from "vscode";
import { FileCompletionProvider } from "./providers/fileCompletionProvider";
import { SkillCompletionProvider } from "./providers/skillCompletionProvider";
import { RefHoverProvider } from "./providers/hoverProvider";
import { SkillScanner } from "./services/skillScanner";
import { copyRelativeRef } from "./commands/copyRelativeRef";

const MD: vscode.DocumentSelector = { language: "markdown" };

export function activate(context: vscode.ExtensionContext): void {
  const scanner = new SkillScanner();

  context.subscriptions.push(
    // @ -> arquivos do workspace
    vscode.languages.registerCompletionItemProvider(
      MD,
      new FileCompletionProvider(),
      "@"
    ),
    // / -> skills (workspace + ~/.claude + plugins)
    vscode.languages.registerCompletionItemProvider(
      MD,
      new SkillCompletionProvider(scanner),
      "/"
    ),
    // hover -> preview de @arquivo e /skill
    vscode.languages.registerHoverProvider(
      MD,
      new RefHoverProvider(scanner)
    ),
    // comandos
    vscode.commands.registerCommand("promptMark.copyRef", (uri?: vscode.Uri) =>
      copyRelativeRef(uri)
    ),
    vscode.commands.registerCommand("promptMark.refreshSkills", () => {
      scanner.refresh();
      vscode.window.setStatusBarMessage("Prompt Mark: skills recarregadas", 3000);
    })
  );
}

export function deactivate(): void {
  // Nada a limpar além dos disposables já registrados em subscriptions.
}

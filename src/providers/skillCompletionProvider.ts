import * as vscode from "vscode";
import { getConfig } from "../config";
import { SkillScanner } from "../services/skillScanner";
import { SLASH_TOKEN } from "../core/patterns";

export class SkillCompletionProvider
  implements vscode.CompletionItemProvider
{
  constructor(private readonly scanner: SkillScanner) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem[] | undefined> {
    if (!getConfig().enableSkills) {
      return undefined;
    }

    const linePrefix = document
      .lineAt(position.line)
      .text.slice(0, position.character);

    const m = SLASH_TOKEN.exec(linePrefix);
    if (!m) {
      return undefined;
    }
    const query = m[1];

    const skills = await this.scanner.getSkills();
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Substitui "/query" pelo "/displayName".
    const start = position.translate(0, -(query.length + 1));
    const range = new vscode.Range(start, position);

    return skills.map((skill) => {
      const item = new vscode.CompletionItem(
        skill.displayName,
        vscode.CompletionItemKind.Reference
      );
      item.insertText = `/${skill.displayName}`;
      item.range = range;
      item.filterText = `/${skill.displayName}`;
      if (skill.description) {
        item.detail = skill.description;
        item.documentation = new vscode.MarkdownString(skill.description);
      }
      return item;
    });
  }
}

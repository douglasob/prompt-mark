import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { getConfig } from "../config";
import { SkillScanner } from "../services/skillScanner";
import { atRefGlobal, SLASH_REF } from "../core/patterns";

const MAX_FILE_BYTES = 1_000_000; // não tenta preview de arquivos > ~1MB.

export class RefHoverProvider implements vscode.HoverProvider {
  constructor(private readonly scanner: SkillScanner) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    if (!getConfig().enableHover) {
      return undefined;
    }

    const line = document.lineAt(position.line).text;
    const col = position.character;

    // 1) Skill /nome no início da linha.
    const sm = SLASH_REF.exec(line);
    if (sm) {
      const startCol = sm.index + sm[0].indexOf("/");
      const endCol = startCol + 1 + sm[1].length;
      if (col >= startCol && col <= endCol) {
        return this.skillHover(sm[1]);
      }
    }

    // 2) Referência @arquivo sob o cursor. Instância nova por varredura para
    // não vazar `lastIndex` entre chamadas.
    const atRef = atRefGlobal();
    let m: RegExpExecArray | null;
    while ((m = atRef.exec(line)) !== null) {
      const refStart = m.index + m[0].indexOf("@");
      const refEnd = refStart + 1 + m[1].length;
      if (col >= refStart && col <= refEnd) {
        return this.fileHover(m[1], token);
      }
    }

    return undefined;
  }

  private async skillHover(name: string): Promise<vscode.Hover | undefined> {
    const skills = await this.scanner.getSkills();
    const skill = skills.find((s) => s.displayName === name);
    if (!skill) {
      return undefined;
    }
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${skill.displayName}**\n\n`);
    md.appendMarkdown(skill.description || "_(sem descrição)_");
    return new vscode.Hover(md);
  }

  private async fileHover(
    rel: string,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const abs = await this.resolveRef(rel);
    if (!abs || token.isCancellationRequested) {
      return undefined;
    }

    try {
      const stat = await fs.stat(abs);
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
        return undefined;
      }
      const buf = await fs.readFile(abs);
      // Heurística de binário: NUL byte no início do conteúdo.
      if (buf.subarray(0, 8000).includes(0)) {
        return undefined;
      }
      const lines = buf.toString("utf8").split(/\r?\n/);
      const limit = getConfig().hoverPreviewLines;
      const preview = lines.slice(0, limit).join("\n");
      const truncated = lines.length > limit;

      const md = new vscode.MarkdownString();
      const ext = path.extname(abs).slice(1);
      md.appendMarkdown(`\`${rel}\`\n\n`);
      md.appendCodeblock(preview + (truncated ? "\n…" : ""), ext || "text");
      return new vscode.Hover(md);
    } catch {
      return undefined;
    }
  }

  /** Resolve um caminho relativo (possivelmente com nome de raiz) num caminho absoluto existente. */
  private async resolveRef(rel: string): Promise<string | undefined> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const candidates: string[] = [];
    for (const f of folders) {
      candidates.push(path.join(f.uri.fsPath, rel));
      // Multi-raiz: rel inclui o nome da raiz como 1º segmento.
      candidates.push(path.join(f.uri.fsPath, "..", rel));
    }
    for (const c of candidates) {
      try {
        if ((await fs.stat(c)).isFile()) {
          return c;
        }
      } catch {
        // tenta o próximo
      }
    }
    return undefined;
  }
}

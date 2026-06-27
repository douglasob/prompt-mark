import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import matter from "gray-matter";

export interface SkillInfo {
  /** Nome inserido: `name` puro ou `<plugin>:<name>` para skills de plugin. */
  displayName: string;
  /** Descrição do frontmatter (pode ser vazia). */
  description: string;
  /** Caminho absoluto do SKILL.md. */
  file: string;
}

/**
 * Scanner de skills do Claude. Varre três "homes":
 *  - workspace:  <root>/.claude/skills/<skill>/SKILL.md
 *  - pessoal:    ~/.claude/skills/<skill>/SKILL.md
 *  - plugins:    ~/.claude/plugins/marketplaces/<plugin>/skills/<skill>/SKILL.md
 *
 * `findFiles` não alcança o $HOME, então usamos fs direto.
 * Resultado é cacheado por sessão (skills mudam raramente);
 * `refresh()` invalida o cache.
 */
export class SkillScanner {
  private cache: SkillInfo[] | null = null;
  private inflight: Promise<SkillInfo[]> | null = null;

  refresh(): void {
    this.cache = null;
    this.inflight = null;
  }

  async getSkills(): Promise<SkillInfo[]> {
    if (this.cache) {
      return this.cache;
    }
    // Coalesce chamadas concorrentes (vários '/' em sequência) num único scan.
    if (!this.inflight) {
      this.inflight = this.scan().then((skills) => {
        this.cache = skills;
        this.inflight = null;
        return skills;
      });
    }
    return this.inflight;
  }

  private async scan(): Promise<SkillInfo[]> {
    const home = os.homedir();
    const byName = new Map<string, SkillInfo>();

    // Workspace e pessoal: <dir>/skills/<skill>/SKILL.md (sem namespace).
    const plainRoots: string[] = [
      path.join(home, ".claude", "skills"),
    ];
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      plainRoots.push(path.join(folder.uri.fsPath, ".claude", "skills"));
    }
    for (const root of plainRoots) {
      for (const s of await this.scanSkillsDir(root, null)) {
        byName.set(s.displayName, s);
      }
    }

    // Plugins: o layout varia entre marketplaces.
    //   - single-plugin:  marketplaces/<plugin>/skills/<skill>/SKILL.md
    //   - multi-plugin:    marketplaces/<mkt>/plugins/<plugin>/skills/<skill>/SKILL.md
    // Então achamos recursivamente qualquer diretório "skills" e derivamos o
    // namespace do segmento imediatamente anterior (= nome do plugin).
    const marketplaces = path.join(home, ".claude", "plugins", "marketplaces");
    for (const skillsDir of await this.findSkillsDirs(marketplaces, 0)) {
      const plugin = path.basename(path.dirname(skillsDir));
      for (const s of await this.scanSkillsDir(skillsDir, plugin)) {
        byName.set(s.displayName, s);
      }
    }

    return [...byName.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }

  /** Lê cada <skillsDir>/<skill>/SKILL.md. `namespace` prefixa o nome quando presente. */
  private async scanSkillsDir(
    skillsDir: string,
    namespace: string | null
  ): Promise<SkillInfo[]> {
    const out: SkillInfo[] = [];
    for (const skillDir of await this.listDirs(skillsDir)) {
      const file = path.join(skillsDir, skillDir, "SKILL.md");
      try {
        const raw = await fs.readFile(file, "utf8");
        const { data } = matter(raw);
        // Fallback: nome do diretório se o frontmatter não trouxer `name`.
        const baseName =
          typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : skillDir;
        const displayName = namespace ? `${namespace}:${baseName}` : baseName;
        const description =
          typeof data.description === "string" ? data.description.trim() : "";
        out.push({ displayName, description, file });
      } catch {
        // Sem SKILL.md ou ilegível: ignora silenciosamente.
      }
    }
    return out;
  }

  // Diretórios pesados/irrelevantes que não vale a pena percorrer.
  private static readonly PRUNE = new Set([
    "node_modules",
    "dist",
    "out",
    "build",
    "cache",
  ]);
  private static readonly MAX_DEPTH = 5;

  /**
   * Encontra recursivamente diretórios chamados "skills" sob `root`, sem
   * descer dentro deles (os filhos são pastas de skill, não outros "skills").
   * Pula node_modules, dot-dirs e afins, e limita a profundidade.
   */
  private async findSkillsDirs(dir: string, depth: number): Promise<string[]> {
    if (depth > SkillScanner.MAX_DEPTH) {
      return [];
    }
    const found: string[] = [];
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    for (const e of entries) {
      if (!e.isDirectory()) {
        continue;
      }
      if (e.name === "skills") {
        found.push(path.join(dir, e.name));
        continue; // não recursar dentro de um diretório de skills
      }
      if (e.name.startsWith(".") || SkillScanner.PRUNE.has(e.name)) {
        continue;
      }
      found.push(...(await this.findSkillsDirs(path.join(dir, e.name), depth + 1)));
    }
    return found;
  }

  /** Lista subdiretórios de `dir`, ou [] se o diretório não existir. */
  private async listDirs(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
}

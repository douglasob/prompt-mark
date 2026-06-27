/**
 * Lógica pura (sem dependência do módulo `vscode`): regexes de gatilho e
 * formatação de referência. Isolada aqui para ser testável com `node --test`
 * sem precisar do runtime do VSCode.
 */

export type InsertFormat = "at" | "path" | "markdownLink";

/**
 * Token `@` ativo no fim da linha, em word-boundary (início de linha ou após
 * espaço). Garante que emails (foo@bar) e menções mid-word NÃO disparem.
 */
export const AT_TOKEN = /(?:^|\s)@([^\s@]*)$/;

/**
 * Token `/` ativo no início da linha (apenas espaços antes da barra). URLs,
 * paths e datas no meio do texto nunca disparam. `:` é aceito para casar
 * skills de plugin (ex.: `caveman:cavecrew`).
 */
export const SLASH_TOKEN = /^\s*\/([^\s/]*)$/;

/** `/skill` no início da linha (uso no hover). */
export const SLASH_REF = /^\s*\/(\S+)/;

/**
 * `@caminho/relativo` em word-boundary (uso no hover). Global/stateful — use
 * uma instância nova por varredura para evitar vazamento de `lastIndex`.
 */
export function atRefGlobal(): RegExp {
  return /(?:^|\s)@([^\s)]+)/g;
}

/**
 * Formata uma referência de arquivo conforme `insertFormat`.
 * @param rel caminho relativo já resolvido (asRelativePath).
 * @param anchor sufixo opcional de linhas (ex.: "#L10-L20"); o nome do link
 *               continua vindo do caminho limpo.
 */
export function formatFileRef(
  rel: string,
  format: InsertFormat,
  anchor = ""
): string {
  switch (format) {
    case "path":
      return rel + anchor;
    case "markdownLink": {
      const name = rel.split("/").pop() ?? rel;
      return `[${name}](${rel}${anchor})`;
    }
    case "at":
    default:
      return `@${rel}${anchor}`;
  }
}

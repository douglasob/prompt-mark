# Changelog

## [0.1.0] - 2026-06-27

Primeira versão (MVP completo).

### Adicionado
- Autocomplete `@` para arquivos do workspace (word-boundary, debounce, `findFiles` on-demand).
- Autocomplete `/` para skills (início de linha), de 3 fontes: workspace, `~/.claude/skills`, plugins (namespaced `plugin:skill`).
- Hover preview de `@arquivo` (primeiras N linhas) e `/skill` (descrição do frontmatter).
- Comando "Copiar caminho como referência @" (palette + menu de contexto, sem keybinding default).
- Comando "Recarregar skills".
- Suporte multi-raiz (`asRelativePath(uri, true)`).
- Settings `promptMark.*`.

### Infra
- Lógica de gatilho/formatação extraída para `src/core/patterns.ts` (pura, testável).
- Testes unitários com `node --test` (regexes de `@`/`/` e `formatFileRef`).
- ESLint (flat config) + `tsc --noEmit` no `vscode:prepublish`.
- CI no GitHub Actions (typecheck, lint, test, package).
- Ícone do Marketplace e metadados (`keywords`, `bugs`, `homepage`, `galleryBanner`).

# Prompt Mark

Extensão do VSCode que traz autocomplete de referências **estilo Claude Code CLI** para arquivos Markdown:

- **`@`** → busca fuzzy de **arquivos do workspace**, insere `@caminho/relativo`.
- **`/`** → lista **skills do Claude** (workspace + `~/.claude/skills` + plugins), insere `/skill` ou `/plugin:skill`.
- **Hover** → preview das primeiras linhas de um `@arquivo` e a descrição de uma `/skill`.
- **Comando** → "Copiar caminho como referência @" (palette + menu de contexto).

Tudo local. Sem rede, sem telemetria.

## Como funcionam os gatilhos

| Você digita | Dispara quando | Resultado |
|---|---|---|
| `@` | início de linha **ou** após espaço (nunca em `email@x`, `foo@bar`) | `@src/foo.md` |
| `/` | **somente** no início da linha (URLs/paths/datas não disparam) | `/grilling`, `/caveman:cavecrew` |

## Rodar em desenvolvimento

```bash
pnpm install
# F5 no VSCode (Run Extension) — compila via esbuild e abre o Extension Development Host
```

Ou compilar manualmente:

```bash
pnpm run compile   # build único
pnpm run watch     # rebuild contínuo
```

Abra um arquivo `.md` no host de desenvolvimento e digite `@` ou `/` no início da linha.

## Qualidade (lint, tipos, testes)

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # eslint
pnpm run check       # typecheck + lint
pnpm test            # node --test (regexes de gatilho + formatFileRef)
```

## Gerar o `.vsix` e instalar localmente

```bash
pnpm run package                      # gera prompt-mark-0.1.0.vsix
code --install-extension prompt-mark-0.1.0.vsix
```

## Settings (`promptMark.*`)

| Setting | Default | Descrição |
|---|---|---|
| `fileGlob` | `**/*` | Glob de arquivos no autocomplete `@`. |
| `excludeGlob` | `**/{node_modules,.git,dist,.nuxt,.output}/**` | Exclusões da busca. |
| `maxResults` | `500` | Máximo de arquivos por busca. |
| `insertFormat` | `at` | `at` (`@path`) · `path` (texto puro) · `markdownLink` (`[nome](path)`). |
| `enableSkills` | `true` | Habilita o autocomplete `/`. |
| `enableHover` | `true` | Habilita o preview de hover. |
| `hoverPreviewLines` | `20` | Linhas mostradas no preview de arquivo. |

## Comandos

- **Prompt Mark: Copiar caminho como referência @** — copia o arquivo ativo/selecionado no formato de `insertFormat`.
- **Prompt Mark: Recarregar skills** — reescaneia as skills (use após criar/editar uma skill).

## Skills: de onde vêm

1. Workspace: `<raiz>/.claude/skills/<skill>/SKILL.md`
2. Pessoal: `~/.claude/skills/<skill>/SKILL.md`
3. Plugins: `~/.claude/plugins/marketplaces/<plugin>/skills/<skill>/SKILL.md` → inseridas como `/<plugin>:<skill>`

`name` e `description` vêm do frontmatter (parse com `gray-matter`); sem `name`, usa o nome do diretório. As skills são cacheadas por sessão — use "Recarregar skills" para atualizar.

## Implementado vs. adiado

**Implementado:** trigger `@` (arquivos), trigger `/` (skills, 3 fontes, namespaced), hover (`@arquivo` + `/skill`), comando copiar referência, multi-raiz, settings.

**Adiado / fora de escopo:** referência a headings (`@path#heading`), snippet de skill expandida, índice persistente + watcher (usamos `findFiles` on-demand com debounce), validação de links quebrados, go-to-definition, inserção de imagens.

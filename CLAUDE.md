# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Prompt Mark is a VSCode extension that brings Claude Code CLI-style autocomplete to Markdown files: `@` triggers fuzzy file search (workspace), `/` triggers Claude skill search (workspace + `~/.claude/skills` + plugin marketplaces), plus hover previews and a token-count status bar item. Package manager is **pnpm**. Code and comments in this repo are in Portuguese (pt-BR); match that when editing `src/`.

## Commands

```bash
pnpm install

# Dev loop: F5 in VSCode ("Run Extension") builds via esbuild and opens
# an Extension Development Host. Manual equivalents:
pnpm run watch        # esbuild --watch
pnpm run compile      # esbuild --production, single build

pnpm run typecheck    # tsc --noEmit
pnpm run lint         # eslint src
pnpm run check        # typecheck + lint (also runs as vscode:prepublish)

pnpm test             # node --test "out/test/**/*.test.js" — requires `tsc -p tsconfig.json` first (pretest runs it automatically)
node --test out/test/patterns.test.js   # run a single test file after compiling with `pretest`

pnpm run package      # vsce package --no-dependencies -> prompt-mark-<version>.vsix
make package          # same, via pnpm
make install          # code --install-extension <computed-vsix-name> --force
```

Test manually: open a `.md` file in the Extension Development Host, type `@` or `/` at the start of a line.

## Architecture

**Layer split — this is the main thing to preserve when editing:**

- `src/core/patterns.ts` has zero dependency on the `vscode` module. It holds the trigger regexes (`AT_TOKEN`, `SLASH_TOKEN`, `SLASH_REF`, `atRefGlobal`) and `formatFileRef`. This isolation is what lets `src/test/patterns.test.ts` run under plain `node --test` without the VSCode runtime. Anything genuinely testable as pure logic belongs here, not in a provider.
- `src/config.ts` reads `promptMark.*` settings into a typed `PromptMarkConfig` and re-exports `formatFileRef`/`InsertFormat` so providers/commands only import from `config`, not `core/patterns`, for anything settings-adjacent.
- `src/providers/` — VSCode-facing `CompletionItemProvider`/`HoverProvider` implementations (`fileCompletionProvider.ts`, `skillCompletionProvider.ts`, `hoverProvider.ts`). These call into `core/patterns` for matching and `services/` for data.
- `src/services/skillScanner.ts` — scans three skill "homes" and merges them by `displayName` (later sources win: workspace/personal are namespace-less, plugins are namespaced `<plugin>:<name>`, derived from the directory name of the plugin, not from a manifest). Session-cached; `refresh()` invalidates. Concurrent calls to `getSkills()` are coalesced via an in-flight promise so multiple `/` keystrokes trigger only one filesystem scan.
- `src/services/tokenCounter.ts` — status bar item, BPE-tokenizes (`gpt-tokenizer`, cl100k) the active Markdown/skill document, debounced on text change, immediate on selection/editor change.
- `src/commands/copyRelativeRef.ts` — "copy as `@` reference" command; appends a `#L<start>-L<end>` anchor when there's an active selection in the target file.
- `src/extension.ts` — the only place providers/commands/disposables get wired up. `activate()` registers everything against `MD` (`markdown` + `skill` language selector) and pushes disposables onto `context.subscriptions`.

**Trigger semantics** (see `src/core/patterns.ts` doc comments and `README.md` table): `@` fires at line-start or after whitespace only (so `foo@bar` emails never trigger); `/` fires only when the line is whitespace-then-slash (so URLs/paths mid-line never trigger). Both regexes are hand-tuned for these false-positive cases — check `src/test/patterns.test.ts` before changing them.

**Skill resolution order** (`SkillScanner.scan`): workspace `.claude/skills/`, then `~/.claude/skills/`, then recursively-discovered `skills/` directories under `~/.claude/plugins/marketplaces/` (namespace = parent directory name). `findFiles` doesn't reach `$HOME`, so this scanner uses `fs/promises` directly rather than the `vscode.workspace` file-search API used by `fileCompletionProvider`.

**Build**: `esbuild.js` bundles `src/extension.ts` → `dist/extension.js` (CJS, `vscode` external, never bundled). The custom `watchMarkerPlugin` emits `[watch] build started`/`finished` markers consumed by `.vscode/tasks.json`'s background problem matcher, which is what lets F5 know when to launch the Extension Development Host.

**Two build outputs exist**: `out/` (via `tsc`, used only for running tests — `pretest` compiles src including `src/test/`) and `dist/` (via esbuild, the actual shipped extension entry point in `package.json`'s `main`). Don't confuse the two when debugging a stale build.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AT_TOKEN,
  SLASH_TOKEN,
  SLASH_REF,
  atRefGlobal,
  formatFileRef,
} from "../core/patterns";

test("formatFileRef: at (default)", () => {
  assert.equal(formatFileRef("src/foo.md", "at"), "@src/foo.md");
  assert.equal(formatFileRef("src/foo.md", "at", "#L10"), "@src/foo.md#L10");
});

test("formatFileRef: path puro", () => {
  assert.equal(formatFileRef("src/foo.md", "path"), "src/foo.md");
  assert.equal(formatFileRef("src/foo.md", "path", "#L1-L3"), "src/foo.md#L1-L3");
});

test("formatFileRef: markdownLink usa basename, âncora no destino", () => {
  assert.equal(formatFileRef("a/b/foo.md", "markdownLink"), "[foo.md](a/b/foo.md)");
  assert.equal(
    formatFileRef("a/b/foo.md", "markdownLink", "#L5"),
    "[foo.md](a/b/foo.md#L5)"
  );
});

test("AT_TOKEN: dispara em word-boundary, captura query", () => {
  assert.equal("@".match(AT_TOKEN)?.[1], "");
  assert.equal("@src/fo".match(AT_TOKEN)?.[1], "src/fo");
  assert.equal("texto antes @foo".match(AT_TOKEN)?.[1], "foo");
});

test("AT_TOKEN: NÃO dispara em email/mid-word", () => {
  assert.equal(AT_TOKEN.test("foo@bar"), false);
  assert.equal(AT_TOKEN.test("email@x.com"), false);
});

test("SLASH_TOKEN: só início de linha (ignora espaços iniciais)", () => {
  assert.equal("/".match(SLASH_TOKEN)?.[1], "");
  assert.equal("/gril".match(SLASH_TOKEN)?.[1], "gril");
  assert.equal("   /caveman:cave".match(SLASH_TOKEN)?.[1], "caveman:cave");
});

test("SLASH_TOKEN: NÃO dispara em URL/path/data no meio", () => {
  assert.equal(SLASH_TOKEN.test("http://x"), false);
  assert.equal(SLASH_TOKEN.test("ver /skill aqui"), false);
  assert.equal(SLASH_TOKEN.test("a/b/c"), false);
});

test("SLASH_REF (hover): captura nome de skill no início da linha", () => {
  assert.equal("/grilling".match(SLASH_REF)?.[1], "grilling");
  assert.equal("  /caveman:cavecrew extra".match(SLASH_REF)?.[1], "caveman:cavecrew");
});

test("atRefGlobal: instância nova não vaza lastIndex", () => {
  const line = "veja @a/b.md e @c/d.md";
  const found: string[] = [];
  const re = atRefGlobal();
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    found.push(m[1]);
  }
  assert.deepEqual(found, ["a/b.md", "c/d.md"]);
  // Segunda varredura com instância fresca repete o resultado.
  const re2 = atRefGlobal();
  assert.equal(re2.exec(line)?.[1], "a/b.md");
});

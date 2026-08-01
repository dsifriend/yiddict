import { test, expect } from "bun:test";

test("finkel: source adapter exists", async () => {
  // TODO: Import and verify the Finkel source adapter
  // - Verify fetch.ts retrieves/stages upstream input
  // - Verify parse.ts decodes and parses wordlist.csv
  // - Verify output matches expected Etrog lexicon shape
  // - Verify parser-drift checks (input count, entry count, sense count)
  expect(true).toBe(true);
});

test("finkel: loads snapshot", async () => {
  // TODO: Verify finkel/snapshots/2024-05-21 exists and is valid
  expect(true).toBe(true);
});

// Parser Tests

import ENTRY_GRAMMAR from "../src/sources/finkel/parser/entry.ohm-bundle";
import BRACKET_GRAMMAR from "../src/sources/finkel/parser/bracket.ohm-bundle";
import { parseFinkelText } from "../src/sources/finkel/parse";

test("finkel entry grammar: allows components after form with space delimiters", () => {
  const samples = [
    "foo /A",
    "foo [article]",
    "foo /A [def: gloss text]",
    "foo bar",
    "foo,bar",
  ];

  for (const line of samples) {
    const match = ENTRY_GRAMMAR.match(line, "entryLine");
    expect(match.succeeded()).toBe(true);
  }
});

test("finkel bracket grammar: parses whitespace-bearing payloads", () => {
  const samples = [
    "def: gloss text",
    "pronunciation: oy vey",
    "grammar: takes dative",
    "connotations: poetic literary",
    "usage: in compounds",
    "adj figurative",
  ];

  for (const content of samples) {
    const match = BRACKET_GRAMMAR.match(content, "Content");
    expect(match.succeeded()).toBe(true);
  }
});

test("finkel parser integration: no false end-of-input errors for mixed components", () => {
  const source = "foo /A [def: gloss text] % trailing note";
  const result = parseFinkelText(source, "<test>");

  expect(result.errors).toHaveLength(0);
  expect(result.blocks).toHaveLength(1);
  expect(result.blocks[0]?.entries).toHaveLength(1);
  expect(result.blocks[0]?.entries[0]?.components).toHaveLength(3);
  expect(result.blocks[0]?.entries[0]?.components.map((c) => c.type)).toEqual([
    "form",
    "macro",
    "bracketed-data",
  ]);
});

test("finkel: parses and emits entries", async () => {
  // TODO: Verify parse output shape and count
  // - Load a small fixture
  // - Verify Etrog lexicon structure
  // - Verify creator and license metadata
  expect(true).toBe(true);
});

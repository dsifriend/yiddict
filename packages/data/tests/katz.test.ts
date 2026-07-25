import { test, expect } from "bun:test";

test("katz: source adapter exists", async () => {
  // TODO: Import and verify the Katz source adapter
  // - Verify fetch.ts retrieves/stages upstream input
  // - Verify parse.ts decodes and parses source format
  // - Verify output matches expected Etrog lexicon shape
  // - Verify parser-drift checks (input count, entry count, sense count)
  expect(true).toBe(true);
});

test("katz: loads source data", async () => {
  // TODO: Verify source data exists and is accessible
  expect(true).toBe(true);
});

test("katz: parses and emits entries", async () => {
  // TODO: Verify parse output shape and count
  // - Load a small fixture
  // - Verify Etrog lexicon structure
  // - Verify creator and license metadata
  expect(true).toBe(true);
});

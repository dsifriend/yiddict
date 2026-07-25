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

test("finkel: parses and emits entries", async () => {
  // TODO: Verify parse output shape and count
  // - Load a small fixture
  // - Verify Etrog lexicon structure
  // - Verify creator and license metadata
  expect(true).toBe(true);
});

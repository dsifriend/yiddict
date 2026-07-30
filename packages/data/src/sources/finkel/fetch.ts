/**
 * Fetches the wordlist from the upstream URL and writes it to the output path.
 *
 * Also stages the raw dictionary snapshot into upstream/ so this source
 * follows the same fetch/build shape as remotely retrieved sources.
 */

const SNAPSHOT_PATH = new URL("./snapshots/2024-05-21/new.s", import.meta.url);
const SNAPSHOT_OUTPUT_PATH = new URL("./upstream/refoyl.txt", import.meta.url);
 
const WORDLIST_FILENAME = "wordlist.csv";
const WORDLIST_UPSTREAM_URL = `https://www.cs.uky.edu/~raphael/yiddish/${WORDLIST_FILENAME}`;
const WORDLIST_OUTPUT_PATH = new URL(`./upstream/${WORDLIST_FILENAME}`, import.meta.url);

async function fetchWordlist() {
	const response = await fetch(WORDLIST_UPSTREAM_URL);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${WORDLIST_UPSTREAM_URL}: ${response.status} ${response.statusText}`,
		);
	}

	// Workaround for https://github.com/oven-sh/bun/issues/13237
	const body = await response.arrayBuffer();
	await Bun.write(WORDLIST_OUTPUT_PATH, body);
	console.log(`Wrote ${WORDLIST_OUTPUT_PATH.pathname}`);
}

async function stageSnapshot() {
	const snapshot = Bun.file(SNAPSHOT_PATH);

	if (!(await snapshot.exists())) {
		throw new Error(`Missing snapshot: ${SNAPSHOT_PATH.pathname}`);
	}

	await Bun.write(SNAPSHOT_OUTPUT_PATH, snapshot);
	console.log(
		`Staged ${SNAPSHOT_PATH.pathname} -> ${SNAPSHOT_OUTPUT_PATH.pathname}`,
	);
}

async function main() {
  await stageSnapshot();
  await fetchWordlist();
}

await main();

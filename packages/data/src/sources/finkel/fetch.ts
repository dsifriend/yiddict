/**
 * Fetches the wordlist from the upstream URL and writes it to the output path.
 *
 * May also fetch raw dictionary file in the future.
 */

const WORDLIST_FILENAME = "wordlist.csv";
const WORDLIST_UPSTREAM_URL = `https://www.cs.uky.edu/~raphael/yiddish/${WORDLIST_FILENAME}`;
const WORDLIST_OUTPUT_PATH = new URL(`./upstream/${WORDLIST_FILENAME}`, import.meta.url);

async function main() {
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

await main();

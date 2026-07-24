/**
 * Fetches the wordlist from the upstream URL and writes it to the output path.
 *
 * May also fetch raw dictionary file in the future.
 */

const FILENAME = "wordlist.csv";
const UPSTREAM_URL = `https://www.cs.uky.edu/~raphael/yiddish/${FILENAME}`;
const OUTPUT_PATH = new URL(`./upstream/${FILENAME}`, import.meta.url);

async function main() {
	const response = await fetch(UPSTREAM_URL);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${UPSTREAM_URL}: ${response.status} ${response.statusText}`,
		);
	}

	// Workaround for https://github.com/oven-sh/bun/issues/13237
	const body = await response.arrayBuffer();
	await Bun.write(OUTPUT_PATH, body);
	console.log(`Wrote ${OUTPUT_PATH.pathname}`);
}

await main();

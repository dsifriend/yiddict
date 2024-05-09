<script lang="ts">
	import { redirect } from '@sveltejs/kit';
	import * as cheerio from 'cheerio';

	async function search(e: SubmitEvent) {
		const q: FormData = new FormData(e.target as HTMLFormElement);
		// Only post a true search request from "/search", and redirect there otherwise.
		if ('/search' != location.pathname) {
			const suffix = new URLSearchParams(q as any).toString();
			const searchAddress = `/search${suffix}`;

			console.log('Redirecting…');
			redirect(303, searchAddress);
		}
		// Otherwise, assume search parameters have been passed correctly from the form or page load.
		else {
			console.log([...q.entries()]);
			document.querySelector('main')!.innerHTML =
				(await searchFinkel(q)) ?? '<p>נישט גאָרנישט געפֿונען.</p>';
		}
	}

	// Post a query to Raphael Finkel's dictionary lookup.
	async function searchFinkel(q: FormData): Promise<string | null> {
		// Construct `FormData` object compatible w/ external source.
		const formdata = new FormData();
		// Add the search term `search` to the corresponding field.
		formdata.append(q.get('wordForm') as string, q.get('search') as string);
		// Add preference for whole or substring matches.
		if (q.has('wholeWord')) {
			formdata.append('wholeWord', 'on');
		}
		// Make external POST request
		const response = await fetch('https://www.cs.uky.edu/~raphael/yiddish/dictionary.cgi', {
			method: 'post',
			body: formdata
		}).then((t) => t.text());

		// Use CheerioJS to query for the search results within the `response`.
		const $ = cheerio.load(response);

		// Wrap elements to apply our own styles.
		$('.lexeme').wrap('<h3></h3>');
		$('.grammar').wrap('<small></small>');
		$('.goodmatch').wrap('<ins></ins>');
		$('.weakmatch').wrap('<mark></mark>');

		const results = `<h2>רעזולטאַטן</h2><ul>${$('ul').html()}</ul>`;

		return results ? results : '';
	}
</script>

<!-- A "Form Action" is not preferred here, as the goal is
	to enable full offline functionality in the future. -->
<form id="searchbox" on:submit|preventDefault={search}>
	<input type="search" name="search" placeholder="זוך" aria-label="זוך־פונקציע" required />
	<!-- Advanced Options -->
	<details style="max-width: fit-content;">
		<summary>ברירות</summary>
		<fieldset>
			<label>
				גאַנצע־װערטער &nbsp;<input name="wholeWord" type="checkbox" role="switch" checked />
			</label>
		</fieldset>
		<select name="wordForm" aria-label="בייגונג">
			<option value="word" selected>אומגעבױגן</option>
			<option value="base">געבױגן</option>
		</select>
	</details>
</form>

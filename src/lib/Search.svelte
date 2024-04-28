<script lang="ts">
	import { redirect } from '@sveltejs/kit';
	import * as cheerio from 'cheerio';

	function search(q: FormData) {
		// Only post a true search request from "/search", and redirect there otherwise.
		if ('/search' != location.pathname) {
			const suffix = new URLSearchParams(q as any).toString();
			const searchAddress = `/search?${suffix}`;

			redirect(303, searchAddress);
		}
		// Otherwise, assume search parameters have been passed correctly from the form or page load.
		else {
			document.querySelector('main')?.replaceWith(searchFinkel(q));
		}
	}

	// Post a query to Raphael Finkel's dictionary lookup.
	async function searchFinkel(q: FormData): HTMLElement {
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
		});

		// Extracted unordered list of results from `response`.
		//TODO
	}
</script>

<!-- A "Form Action" is not preferred here, as the goal is
	to enable full offline functionality in the future. -->
<form id="searchbox" on:submit={search}>
	<input type="search" name="search" placeholder="זוך" aria-label="זוך⸗פונקציע" required />
	<!-- Advanced Options -->
	<details style="max-width: fit-content;">
		<summary>ברירות</summary>
		<fieldset>
			<label>
				<input name="wholeWord" type="checkbox" role="switch" />
				גאַנצע־װערטער
			</label>
		</fieldset>
		<select name="wordForm" aria-label="בייגונג">
			<option selected disabled value="base">געבױגן</option>
			<option value="base">געבױגן</option>
			<option value="word">אומגעבױגן</option>
		</select>
	</details>
</form>

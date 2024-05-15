import * as cheerio from 'cheerio';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	// Convert from the URLSearchParams back to FormData.
	const q = new FormData();
	for (const param of url.searchParams) {
		q.append(param[0], param[1]);
	}

	return {
		results: await getResults(q)
	};
};

// Function to fetch and collect search results from various sources.
async function getResults(q: FormData): Promise<string | null> {
	// All search results are fetched from Rafael Finkel's site atm.
	return searchFinkel(q);
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
	const response = await fetch('https://yiddict.app/external', {
		method: 'post',
		body: formdata
	}).then((t) => t.text());

	// Use CheerioJS to query for the search results within the `response`.
	const $ = cheerio.load(response);

	// Wrap elements to apply our own styles.
	$('.lexeme').wrap('<strong></strong>');
	$('.grammar').wrap('<small></small>');
	$('.goodmatch').wrap('<mark></mark>');
	$('.weakmatch').wrap('<mark></mark>');
	$('.goodmatch').wrap('<ins></ins>');

	const results = $('ul').html();

	return results ? results : '';
}

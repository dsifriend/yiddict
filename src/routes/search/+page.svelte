<script lang="ts">
	export let data: { results: string };
</script>

<main dir="ltr">
	{#await data.results}
		<h2 dir="rtl">זוך אַ װאָרט, אַ ליאַדע װאָרט!</h2>
	{:then results}
		<h2>רעזולטאַטן</h2>
		<br />
		<ul>{results}</ul>
		<br />
		<p style="text-align: end;">
			Sourced from
			<a href="https://www.cs.uky.edu/~raphael/yiddish/dictionary.cgi">רפֿאלס ייִדיש וועב–בלעטל</a>
		</p>
	{:catch}
		<h2>רעזולטאַטן</h2>
		<br />
		<h3>גאַרנישט געפֿונען</h3>
	{/await}
</main>

<style lang="scss">
	@use '@picocss/pico/scss/colors' as *;

	main > ul {
		list-style: none;
	}

	:global(main > ul > li) {
		margin-bottom: 3rem;
	}
</style>

<script lang="ts">
	export let data: { results: string };
</script>

<main dir="ltr">
	{#await data.results}
		<h2 dir="rtl">זוך אַ װאָרט, אַ ליאַדע װאָרט!</h2>
	{:then results}
		{#if '' != results}
			<h2>רעזולטאַטן</h2>
			<br />
			<ul>{@html results}</ul>
			<br />
			<p style="text-align: end;">
				Sourced from
				<a href="https://www.cs.uky.edu/~raphael/yiddish/dictionary.cgi">
					רפֿאלס ייִדיש וועב–בלעטל
				</a>
			</p>
		{:else}
			<h2>גאַרנישט געפֿונען</h2>
		{/if}
	{/await}
</main>

<style lang="scss">
	@use '@picocss/pico/scss/colors' as *;

	main > ul {
		list-style: none;
	}

	:global(main > ul > li) {
		margin-bottom: 1.5rem;
		list-style: none;
	}

	:global(mark) {
		padding: 0;
	}
</style>

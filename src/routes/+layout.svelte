<script lang="ts">
	import '@picocss/pico/css/pico.min.css';
	import Search from '$lib/Search.svelte';

	let { children } = $props();
</script>

<header>
	<nav>
		<ul>
			<li>
				<a href="/"><h1 id="home">ייִדיקט</h1></a>
			</li>
		</ul>
		<ul>
			<li style="padding: 0;">
				<details class="dropdown">
					<summary style="width: 8.25em; text-align: center;">אינפאָרמאַציע</summary>
					<ul>
						<li class="secondary"><a href="/about">וועגן אונדז</a></li>
						<li class="secondary"><a href="/help">הילף</a></li>
						<li class="secondary"><a href="/license">מחברים־רעכט</a></li>
					</ul>
				</details>
			</li>
		</ul>
	</nav>
	<Search></Search>
</header>
{@render children()}


<style>
	* {
		font-family: Arial, sans-serif;
	}

	:global(body) {
		padding: 3mm;
		margin-inline: 0 auto;
	}

	header,
	:global(main) {
		max-width: 48em;
		margin-inline: auto;
	}

	#home {
		color: var(--pico-azure-500);
	}
</style>

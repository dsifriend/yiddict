<script lang="ts">
	import '@picocss/pico';
	import Search from '$lib/Search.svelte';
</script>

<body class="container" dir="rtl">
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
	<slot />
</body>

<style lang="scss">
	@import '@picocss/pico/scss/colors' ;

	* {
		font-family: Arial, sans-serif;
	}

	body {
		padding: 3mm;
		max-width: 48em;

		* {
            max-width: unset;
		}
	}

	#home {
		color: $azure-500;
	}
</style>

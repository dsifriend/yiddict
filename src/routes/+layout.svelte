<script lang="ts">
	import '@picocss/pico';
	import Search from '$lib/Search.svelte';
</script>

<body class="container" dir="rtl">
	<header>
		<nav>
			<ul>
				<li><a href="/"><h1 id="home">ייִדיקט</h1></a></li>
			</ul>
			<ul>
				<li>
					<details class="dropdown" dir="ltr">
						<summary>אינפאָרמאַציע</summary>
						<ul>
							<li class="secondary"><a href="/about">וועגן אונז</a></li>
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
	@use '@picocss/pico/scss/colors' as *;

	* {
		font-family: Arial, sans-serif;
		max-width: 54em;
	}

	#home {
		color: $azure-500;
	}
</style>

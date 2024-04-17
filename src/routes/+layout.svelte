<script lang="ts">
	import '@picocss/pico';
</script>

<body class="container" dir="rtl">
	<header>
		<h1 id="home">ייִדיקט</h1>
		<form id="searchbox">
			<input type="search" name="search" placeholder="זוך" aria-label="זוך⸗פונקציע" />
		</form>
	</header>
	<main>
		<slot />
	</main>
</body>

<style lang="scss">
	@use '@picocss/pico/scss/pico' with (
		$theme-color: 'azure'
	);
	@use '@picocss/pico/scss/colors' as *;

	* {
		font-family: Arial, sans-serif;
	}

	#home {
		color: $azure-500;
	}
</style>

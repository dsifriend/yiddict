<script lang="ts">
	import '@picocss/pico';
</script>

<body class="container" dir="rtl">
	<header>
		<h1 style="color: $blue-900;">ייִדיקט</h1>
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
		$theme-color: 'blue'
	);

	* {
		font-family: Arial, sans-serif;
	}
</style>

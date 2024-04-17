<svelte:head>
	<link rel="stylesheet" href="css/pico.blue.min.css" />
</svelte:head>

<body>
	<main class="container">
		<h1>ייִדיקט</h1>
		<hr />
		<form id="searchbox">
			<input type="search" name="search" placeholder="זוך" aria-label="זוך⸗פונקציע" />
		</form>
		<hr />
		<slot />
	</main>
</body>

<style lang="scss">
	* {
		font-family: Arial, sans-serif;
	}
</style>

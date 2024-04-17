<svelte:head>
	<link rel="stylesheet" href="css/pico.blue.min.css" />
</svelte:head>

<body>
	<main class="container">
		<h1>ייִדיקט</h1>
		<hr />
		<form id="searchbox"></form>
		<hr />
		<slot />
	</main>
</body>

<style lang="scss">
	* {
		font-family: Arial, sans-serif;
	}
</style>

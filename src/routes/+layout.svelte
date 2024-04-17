<script lang="ts">
	import '@picocss/pico';
</script>

<body class="container" dir="rtl">
	<header>
		<h1 id="home">ייִדיקט</h1>
		<form id="searchbox">
			<input type="search" name="search" placeholder="זוך" aria-label="זוך⸗פונקציע" />
			<!-- Advanced Options -->
			<details>
				<summary>ברירות</summary>
				<fieldset>
					<label>
						<input name="wholeWord" type="checkbox" role="switch" />
						גאַנצע־װערטער
					</label>
				</fieldset>
				<select name="wordForm" aria-label="בייגונג">
					<option selected disabled value="base">געבױגן</option>
					<option value="base">געבױגן</option>
					<option value="word">אומגעבױגן</option>
				</select>
			</details>
		</form>
	</header>
	<slot />
</body>

<style lang="scss">
	@use '@picocss/pico/scss/colors' as *;

	* {
		font-family: Arial, sans-serif;
	}

	#home {
		color: $azure-500;
	}
</style>

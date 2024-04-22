<script lang="ts">
	import '@picocss/pico';
</script>

<body class="container" dir="rtl">
	<header>
		<nav>
			<ul>
				<li><h1 id="home">ייִדיקט</h1></li>
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
		<form id="searchbox">
			<input type="search" name="search" placeholder="זוך" aria-label="זוך⸗פונקציע" />
			<!-- Advanced Options -->
			<details style="max-width: fit-content;">
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
		max-width: 54em;
	}

	#home {
		color: $azure-500;
	}
</style>

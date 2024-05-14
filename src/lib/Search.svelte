<script lang="ts">
	// Creates URLSearchParams for a query and navigates
	// to a search page running that query.
	async function search(e: SubmitEvent) {
		const q: FormData = new FormData(e.target as HTMLFormElement);
		const suffix = new URLSearchParams(q as any).toString();
		const searchAddress = `/search?${suffix}`;

		location.assign(searchAddress);
	}
</script>

<!-- A "Form Action" is not preferred here, as the goal is
	to enable full offline functionality in the future. -->
<form id="searchbox" on:submit|preventDefault={search}>
	<input type="search" name="search" placeholder="זוך" aria-label="זוך־פונקציע" required />
	<!-- Advanced Options -->
	<details style="max-width: fit-content;">
		<summary>ברירות</summary>
		<fieldset>
			<label>
				גאַנצע־װערטער &nbsp;<input
					id="wholeWord"
					name="wholeWord"
					type="checkbox"
					role="switch"
					checked
				/>
			</label>
		</fieldset>
		<select id="wordForm" name="wordForm" aria-label="בייגונג">
			<option value="word" selected>אומגעבױגן</option>
			<option value="base">געבױגן</option>
		</select>
	</details>
</form>

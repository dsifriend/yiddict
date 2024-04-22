<!--TODO: Better highlight input suggestions with `mark`, `ins`, etc.-->
<main dir="ltr">
	<h1>הילף</h1>
	<h2>Help</h2>
	<p>
		The search function might not work as expected, if you're used to more modern/complex online
		dictionaries (for now). In general, only exact matches (whether partial or whole) are returned.
		The following hints should help you find what you need.
	</p>
	<section>
		<h3>Searchable Strings</h3>
		<p>
			Currently, the search function searches for matches in all text belonging to an entry (i.e.
			term, definition, grammar notes, etc.) The Yiddish-first UI is intended to encourage input in
			straight Yiddish, but internally all entries are encoded in their YIVO-standard transcription.
			Entries for לשינ־קודש words should be searchable with their hebrew spelling. See notes on
			transcription below.
		</p>
		<h3>Yiddish words in Yiddish letters</h3>
		<p>
			You may use ligatures or not, and if you leave out nekudes, the program will try to fill them
			in.
		</p>
		<p>
			Try searching for the <strong>stem of a word</strong> (not the plural, case-marked, or conjugated
			form) of nouns, adjectives, and verbs. Unless disabled from the advanced search options, the app
			will try identifying this for you, but it's not perfect.
		</p>
		<details>
			<!-- svelte-ignore a11y-no-redundant-roles -->
			<summary class="secondary" role="button">Examples</summary>
			<ul>
				<li>Type <b>פּלימעניק</b>, not <i>פּלימעניקעס</i></li>
				<li>
					Type <b>שײן</b>, not <i>שײנע</i>, and <b>העלף</b>, not <i>העלפֿן</i> or
					<i>אונטערגעהאָלפֿן</i>
				</li>
			</ul>
		</details>
	</section>
	<section>
		<h3>Yiddish words in YIVO transcription</h3>
		<p>You may write Yiddish words using their YIVO transcription.</p>
		<p>
			Try searching for the <strong>stem of a word</strong> (not the plural, case-marked, or conjugated
			form) of nouns, adjectives, and verbs. Unless disabled from the advanced search options, the app
			will try identifying this for you, but it's not perfect.
		</p>
		<details>
			<!-- svelte-ignore a11y-no-redundant-roles -->
			<summary class="secondary" role="button">Examples</summary>
			<ul>
				<li>Type <b>plimenik</b>, not <i>plimenikes</i></li>
				<li>Type <b>sheyn</b>, not <i>sheyne</i></li>
				<li>Type <b>helf</b>, not <i>helfn</i> or <i>geholfn</i></li>
			</ul>
		</details>
		<details>
			<!-- svelte-ignore a11y-no-redundant-roles -->
			<summary class="secondary" role="button">YIVO Alphabet</summary>
			<p>YIVO uses the following <strong>consonants </strong>for its transcriptions:</p>
			<p style="text-align: center;">
				ב:b ג:g ד:d ה:h װ:v ז:z כ:kh ט:t י:y ל:l מ:m נ:n ס:s פֿ:f פּ:p צ:ts ק:k ר:r ש:sh טש:tsh זש:zh
				דזש:dj
			</p>
			<p>YIVO uses the following <strong>vowels</strong> for its transcriptions:</p>
			<p style="text-align: center;">אַ:a ע:e י:i אָ:o ו:u ױ:oy ײַ:ay ײ:ey</p>
			<details>
				<!-- svelte-ignore a11y-no-redundant-roles -->
				<summary class="secondary" role="button">Example</summary>
				<p>The following sentence is correctly transliterated:</p>
				<p style="text-align: center;">איך בינ געקומנ אַזױ װײַט צו שרײַבן אַ ביסל מאַמע־לשון!</p>
				<p style="text-align: center;">ikh bin gekumen azoy vayt tsu shraybn a bisl mame-loshn!</p>
			</details>
			<p>
				Do not use German phonetic spelling. For instance, don't write <i>schpiel</i> to mean
				<b>shpil</b>.
			</p>
		</details>
	</section>
	<section>
		<h3>Words derived from לשינ־קודש</h3>
		<p>
			Use capital letters for the first letters of Hebrew proper names (like <b>Refoyl</b> and
			<b>Binyomen</b>). Don't use <em>capital letters</em> for any other Yiddish words.
		</p>
		<p>
			If you need a לשינ־קודש derived word, first spell it phonetically. Unaccented vowels often
			should be spelled with an <b>e</b>, as in <b>borekh</b>, <b>bimkem</b>, and <b>maskem</b>.
		</p>
		<details>
			<!-- svelte-ignore a11y-no-redundant-roles -->
			<summary class="secondary" role="button">ASCII encoding for לשינ־קודש</summary>
			<p>
				If you don't know or can't guess the pronunciation (or rather, the YIVO transcription), the
				app provides the following custom ASCII-based encoding to help input לשינ־קודש if required:
			</p>
			<p style="text-align: center;">#:א B:בֿ w:ו H:ח K:כּ x:כ e:ע c:צ S:ש Q:שׂ T:ת W:תּ</p>
			<p>Don't distinguish final khof, mem, nun, fe, tsadi.</p>
			<details>
				<!-- svelte-ignore a11y-no-redundant-roles -->
				<summary class="secondary" role="button">Examples</summary>
				<ul>
					<li>Type <b>msKym</b> for <b>מסכּים</b></li>
					<li>Type <b>Slwm</b> for <b>שלום</b></li>
				</ul>
			</details>
			<p>
				Internally, all לשינ־קודש words are encoded with enclosing <em>braces</em> (e.g.
				<b>&lbrace;ym&rbrace;</b>), so a partial search for <b>ym&rbrace;</b> should find all
				לשינ־קודש words ending in <b>ים</b>.
			</p>
		</details>
	</section>
	<section>
		<h3>Other Information</h3>
		<p>
			The search function looks through <em>all text</em> in an entry for matches. This means that
			supplementary data, such as that recorded by <strong>Raphael Finkel</strong>
			in some of his entries may be returned by searching for categories like <b>clothing</b> or
			<b>sound</b>.
		</p>
		<p>Grammar details such as <b>indeclinable</b> are also searchable.</p>
		<p>Usage notes are often also available, e.g. <b>inadmissible</b> or <b>German</b>.</p>
		<p>
			Occasionally, sources for a word will be listed if not generally found in standard
			dictionaries.
		</p>
		<details>
			<!-- svelte-ignore a11y-no-redundant-roles -->
			<summary class="secondary" role="button">Examples</summary>
			<ul>
				<li>Forwards</li>
				<li>Hoffman</li>
				<li>Bergelson</li>
				<li>note: V</li>
			</ul>
		</details>
	</section>
	<section>
		<h3>Non-standard Spellings</h3>
		<p>
			If you are trying to find a word that uses other transliteration schemes than YIVO's (see the
			<a href="https://en.wikipedia.org/wiki/Yiddish_orthography">Wikipedia article</a>
			for some insight), consider making these adjustments:
		</p>
		<ol>
			<li>
				Don't use the prefix <i>be-</i>; use
				<b>ba-</b>.
			</li>
			<li>
				Don't use the prefix <i>er-</i>; use
				<b>der-</b>.
			</li>
			<li>
				Don't use the inseparable verb prefix <i>tsu-</i>; use
				<b>tse-</b>.
			</li>
			<li>
				Don't place an <i>h</i> after a vowel to lengthen it; write
				<b>ey</b>
				instead of
				<i>eh</i>, for instance.
			</li>
			<li>
				If the text doesn't distinguish a tsvey-yudn (<b>ײ</b>) from pasekh-tsvey-yudn (<b>ײַ</b>),
				try both
				<b>ay</b> and <b>ey</b>.
			</li>
			<li>
				Similarly, if the text doesn't distinguish pe (<b>פּ</b>) from fe (<b>פֿ</b>), try both
				<b>p</b> and <b>f</b>.
			</li>
			<li>
				If the text has a word starting with alef-yud (such as <i>אינגל</i>), also search for it
				with <b>yi</b>, as in
				<b>yingl</b>.
			</li>
			<li>
				If the text has a word ending in <i>-ig</i>, try
				<b>-ik</b>.
			</li>
			<li>
				The epenthetic ayin before a nun <i>en</i>
				(<i>ענ</i>) is sometimes absent in modern spelling, leaving just the nun.
			</li>
			<li>
				If the text has a double consonant, such as <i>tt</i>, search with a single consonant, such
				as <b>t</b>.
			</li>
			<li>
				If the text has an alef with a segol (<b>אֶ</b>), try
				<b>e</b>.
			</li>
			<li>
				Transliterate the khes (<b>ח</b>) as <b>kh</b>. Some books use the khes where standard
				orthography uses the khof (<b>כ</b>).
			</li>
			<li>
				If your text has a final khof with a dagesh (<b>ךּ</b>), just ignore the dagesh and use
				<b>kh</b>.
			</li>
		</ol>
	</section>
</main>

<style lang="scss">
	details {
		p {
			margin-left: 2em;
		}

		details {
			margin-left: 1em;
		}
	}

	section {
		padding-bottom: 3ex;
	}
</style>

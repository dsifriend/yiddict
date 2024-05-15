import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		proxy: {
			'/external': 'https://www.cs.uky.edu/~raphael/yiddish/dictionary.cgi'
		}
	},
	plugins: [sveltekit()]
});

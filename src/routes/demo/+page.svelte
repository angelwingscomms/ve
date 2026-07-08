<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<main class="demo-index">
	<h1>Demo</h1>
	<a href={resolve('/demo/playwright')} class="demo-link">Playwright e2e test demo →</a>
</main>

<style>
	.demo-index {
		max-width: 960px;
		margin: 0 auto;
		padding: 4rem 1.5rem;
	}
	.demo-index h1 {
		margin-bottom: 1.5rem;
	}
	.demo-link {
		font-size: 1.125rem;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
	}
</style>

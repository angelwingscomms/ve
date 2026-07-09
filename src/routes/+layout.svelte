<script lang="ts">
	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<nav>
	<div class="nav-inner">
		<a href="/" class="logo">ve</a>
		<div class="nav-right">
			{#if data?.user}
				<a href="/i" class="nav-link">Dashboard</a>
				<a href="/test" class="nav-link">Test</a>
				<span class="user-name">{data.user.name}</span>
				<form action="/logout" method="post"><button class="btn-ghost">Sign out</button></form>
			{:else}
				<a href="/login" class="btn-primary-sm">Sign in</a>
			{/if}
		</div>
	</div>
</nav>

{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	:global(body) {
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		background: #f9fafb;
		color: #111;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
	}
	:global(a) {
		color: #2563eb;
		text-decoration: none;
	}
	:global(a:hover) {
		text-decoration: underline;
	}
	:global(button) {
		font-family: inherit;
		cursor: pointer;
	}
	:global(h1) {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}
	:global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
	}
	:global(p) {
		color: #555;
	}

	nav {
		border-bottom: 1px solid #e5e7eb;
		background: #fff;
	}
	.nav-inner {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 1.5rem;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.logo {
		font-weight: 700;
		font-size: 1.125rem;
		color: #111;
		letter-spacing: -0.02em;
	}
	.logo:hover {
		text-decoration: none;
	}
	.nav-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: #555;
	}
	.nav-link:hover { color: #111; text-decoration: none; }
	.user-name {
		font-size: 0.875rem;
		color: #666;
	}
	.btn-primary-sm {
		display: inline-flex;
		align-items: center;
		height: 34px;
		padding: 0 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #fff;
		background: #111;
		border-radius: 8px;
		transition: background 0.15s;
	}
	.btn-primary-sm:hover {
		background: #333;
		text-decoration: none;
	}
	.btn-ghost {
		background: none;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 0.375rem 0.875rem;
		font-size: 0.875rem;
		color: #555;
		transition: background 0.15s;
	}
	.btn-ghost:hover {
		background: #f3f4f6;
	}
</style>

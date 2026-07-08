<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>vids — YouTube automation</title>
</svelte:head>

<main class="hero">
	<div class="hero-text">
		<h1>Automate your<br />YouTube channel</h1>
		<p class="hero-sub">
			Schedule AI-powered video generation. Set it once,<br />your channel stays fresh.
		</p>

		{#if data?.user}
			<p class="welcome">Welcome back, {data.user.name}!</p>
		{:else}
			<a href="/login" class="btn-primary">Sign in with Google →</a>
		{/if}
	</div>
</main>

<style>
	.hero {
		max-width: 960px;
		margin: 0 auto;
		padding: 6rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 57px);
	}
	.hero-text {
		text-align: center;
		max-width: 600px;
	}
	.hero-sub {
		font-size: 1.125rem;
		color: #666;
		margin-top: 1rem;
		line-height: 1.7;
	}
	.welcome {
		margin-top: 2rem;
		font-size: 1.125rem;
		color: #333;
	}
	.btn-primary {
		display: inline-flex;
		align-items: center;
		height: 44px;
		padding: 0 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		background: #111;
		border-radius: 10px;
		margin-top: 2rem;
		transition: background 0.15s;
	}
	.btn-primary:hover {
		background: #333;
		text-decoration: none;
	}
</style>

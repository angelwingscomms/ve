<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Sign in — vids</title>
</svelte:head>

<main class="page">
	<div class="card">
		<h1>Sign in</h1>
		<p>Sign in with your Google account to get started.</p>
		<a href="/login/google" class="btn-google">Sign in with Google</a>
	</div>
</main>

<style>
	.page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 120px);
	}
	.card {
		text-align: center;
		padding: 3rem 2.5rem;
		background: #fff;
		border-radius: 16px;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.06),
			0 1px 2px rgba(0, 0, 0, 0.04);
		border: 1px solid #e5e7eb;
		max-width: 380px;
		width: 100%;
	}
	.card h1 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}
	.card p {
		font-size: 0.9375rem;
		margin-bottom: 2rem;
	}
	.btn-google {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		padding: 0 1.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #fff;
		background: #111;
		border-radius: 10px;
		width: 100%;
		transition: background 0.15s;
	}
	.btn-google:hover {
		background: #333;
		text-decoration: none;
	}
</style>

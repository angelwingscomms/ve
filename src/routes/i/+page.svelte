<script lang="ts">
	let { data } = $props();
	let prompt = $state('');
	let model = $state('');
	let period = $state('86400000');
	let key = $state('');
	let key_msg = $state('');
	let create_msg = $state('');
	let use_custom = $state(false);

	function fmt(t: number) {
		const d = Date.now() - t;
		const mins = Math.floor(d / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	async function save_key() {
		const r = await fetch('/api/me', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ a: { o: key } })
		});
		if (r.ok) { key_msg = 'Saved!'; setTimeout(() => location.reload(), 500); }
		else key_msg = 'Failed to save';
	}

	async function create_vid(e: Event) {
		e.preventDefault();
		const r = await fetch('/api/vids', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: crypto.randomUUID(), p: prompt, m: model, r: parseInt(period) })
		});
		if (r.ok) { create_msg = 'Created!'; prompt = ''; model = ''; setTimeout(() => location.reload(), 300); }
		else create_msg = 'Failed to create';
	}

	async function del(id: string) {
		await fetch('/api/vids', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
		location.reload();
	}
</script>

<svelte:head>
	<title>Dashboard — ve</title>
</svelte:head>

<main class="dash">
	<h1>Dashboard</h1>

	{#if !data.user_data?.a?.o}
		<section class="card">
			<h2>Set OpenRouter API key</h2>
			<p>Enter your OpenRouter API key to enable video model selection.</p>
			<input bind:value={key} type="password" placeholder="sk-or-v1-..." class="input" />
			<button onclick={save_key} class="btn">Save</button>
			{#if key_msg}<p class="msg">{key_msg}</p>{/if}
		</section>
	{/if}

	<section class="card">
		<h2>Create a vid</h2>
		<form onsubmit={create_vid}>
			<label for="p">Prompt</label>
			<textarea id="p" bind:value={prompt} class="input" rows={3} placeholder="Describe the video you want to generate..." required></textarea>

			<label for="m">Model</label>
			{#if data.models?.length}
				<select id="m" bind:value={model} class="input" required>
					<option value="">Select a model...</option>
					{#each data.models as m}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			{:else}
				<input bind:value={model} class="input" placeholder="Model ID (e.g. openai/4o-video)" required />
			{/if}

			<label>Schedule</label>
			<div class="periods">
				<button type="button" class={period === '3600000' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '3600000'; use_custom = false; }}>Every hour</button>
				<button type="button" class={period === '86400000' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '86400000'; use_custom = false; }}>Daily</button>
				<button type="button" class={period === '604800000' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '604800000'; use_custom = false; }}>Weekly</button>
				<button type="button" class={use_custom ? 'btn-active' : 'btn-opt'} onclick={() => use_custom = true}>Custom</button>
			</div>
			{#if use_custom}
				<input type="number" bind:value={period} class="input" placeholder="Period in ms" />
			{/if}

			<button type="submit" class="btn" disabled={!prompt || !model}>Create</button>
			{#if create_msg}<p class="msg">{create_msg}</p>{/if}
		</form>
	</section>

	<section class="card">
		<h2>My vids</h2>
		{#if data.vids?.length}
			<div class="vids">
				{#each data.vids as v}
					<div class="vid-row">
						<div class="vid-info">
							<span class="vid-prompt">{v.p.slice(0, 60)}{v.p.length > 60 ? '…' : ''}</span>
							<span class="vid-meta">{v.m} · {fmt(v.d)}</span>
						</div>
						<div class="vid-right">
							<span class="badge badge-{v.c || 'pending'}">{v.c || 'pending'}</span>
							<button onclick={() => del(v.i)} class="btn-ghost-sm">×</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty">No vids yet. Create one above.</p>
		{/if}
	</section>
</main>

<style>
	.dash { max-width: 720px; margin: 0 auto; padding: 2.5rem 1.5rem; }
	.dash h1 { margin-bottom: 1.5rem; }
	.card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.card h2 { font-size: 1.125rem; margin-bottom: 1rem; }
	.card p { font-size: 0.875rem; margin-bottom: 0.75rem; }
	.input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-family: inherit;
		margin-bottom: 0.75rem;
		box-sizing: border-box;
	}
	.input:focus { outline: none; border-color: #111; }
	label { font-size: 0.8125rem; font-weight: 600; display: block; margin-bottom: 0.25rem; color: #555; }
	.btn {
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #fff;
		background: #111;
		border: none;
		border-radius: 8px;
		cursor: pointer;
	}
	.btn:hover { background: #333; }
	.btn:disabled { opacity: 0.4; cursor: default; }
	.periods { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
	.btn-opt, .btn-active {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-active { background: #111; color: #fff; border-color: #111; }
	.msg { font-size: 0.8125rem; color: #059669; margin-top: 0.5rem; }
	.vids { display: flex; flex-direction: column; gap: 0.5rem; }
	.vid-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		border: 1px solid #f3f4f6;
		border-radius: 8px;
	}
	.vid-info { display: flex; flex-direction: column; gap: 0.125rem; }
	.vid-prompt { font-size: 0.875rem; font-weight: 500; }
	.vid-meta { font-size: 0.75rem; color: #999; }
	.vid-right { display: flex; align-items: center; gap: 0.5rem; }
	.badge {
		font-size: 0.6875rem;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		font-weight: 600;
		text-transform: uppercase;
	}
	.badge-active { background: #dbeafe; color: #1d4ed8; }
	.badge-done { background: #d1fae5; color: #059669; }
	.badge-failed { background: #fee2e2; color: #dc2626; }
	.badge-pending { background: #f3f4f6; color: #6b7280; }
	.btn-ghost-sm {
		background: none;
		border: none;
		font-size: 1.125rem;
		color: #999;
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}
	.btn-ghost-sm:hover { background: #f3f4f6; color: #dc2626; }
	.empty { color: #999; font-size: 0.875rem; }
</style>

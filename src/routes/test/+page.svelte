<script lang="ts">
	import type { Ve } from '$lib/types/ve';

	let { data } = $props();
	let file = $state<File | null>(null);
	let title = $state('');
	let period = $state('0');
	let use_custom = $state(false);
	let uploading = $state(false);
	let result = $state<{ ok?: boolean; yv?: string; workflow_id?: string; next_upload_at?: number; error?: string } | null>(null);
	let test_ves = $state<Ve[]>(data.test_ves);

	async function submit(e: Event) {
		e.preventDefault();
		if (!file) return;
		uploading = true;
		result = null;
		const fd = new FormData();
		fd.append('video', file);
		if (title) fd.append('title', title);
		if (period !== '0') fd.append('period', period);
		const r = await fetch('/api/test', { method: 'POST', body: fd });
		result = await r.json();
		uploading = false;
		if (result.ok) test_ves = await (await fetch('/api/test/list')).json();
	}
</script>

<svelte:head>
	<title>Test — ve</title>
</svelte:head>

<main class="test">
	<h1>Test YouTube Upload</h1>

	<section class="card">
		<h2>Upload a video to test YouTube automation</h2>
		<p>Use your own video file to verify the system can upload to YouTube for you.</p>

		{#if !data.user_data?.a?.y}
			<div class="yt-card">
				<p>Connect your YouTube channel first.</p>
				<a href="/yt/auth" class="btn yt-btn">Connect YouTube</a>
			</div>
		{:else}
			<p class="yt-ok">YouTube connected ✓</p>
		{/if}

		<form onsubmit={submit}>
			<label for="video">Video file</label>
			<input id="video" type="file" accept="video/*" onchange={(e) => file = (e.target as HTMLInputElement).files?.[0] || null} required class="input" />

			<label for="t">Title (optional)</label>
			<input id="t" type="text" bind:value={title} class="input" placeholder={"Test upload at " + new Date().toISOString().slice(0, 19)} />

		<span id="test-sched-lbl" class="lbl">Schedule</span>
		<div class="periods" role="group" aria-labelledby="test-sched-lbl">
				<button type="button" class={period === '0' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '0'; use_custom = false; }}>No schedule</button>
				<button type="button" class={period === '3600000' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '3600000'; use_custom = false; }}>Every hour</button>
				<button type="button" class={period === '86400000' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '86400000'; use_custom = false; }}>Daily</button>
				<button type="button" class={period === '604800000' ? 'btn-active' : 'btn-opt'} onclick={() => { period = '604800000'; use_custom = false; }}>Weekly</button>
				<button type="button" class={use_custom ? 'btn-active' : 'btn-opt'} onclick={() => use_custom = true}>Custom</button>
			</div>
			{#if use_custom}
				<input type="number" bind:value={period} class="input" placeholder="Period in ms" />
			{/if}

			<button type="submit" disabled={!file || uploading} class="btn">{uploading ? 'Uploading…' : 'Upload to YouTube'}</button>
		</form>
	</section>

	{#if result}
		<section class="card result">
			{#if result.ok}
				{#if result.yv}
					<p class="success">✅ Uploaded to YouTube!</p>
					<a href="https://youtube.com/watch?v={result.yv}" target="_blank" class="yt-link-lg">Watch on YouTube →</a>
				{:else if result.workflow_id}
					<p class="success">✅ Job created — will upload on schedule</p>
				{:else}
					<p class="success">✅ Job created</p>
				{/if}
			{:else}
				<p class="error">❌ {result.error || 'Upload failed'}</p>
			{/if}
		</section>
	{/if}

	<section class="card">
		<h2>Test Jobs</h2>
		{#if test_ves.length === 0}
			<p class="empty">No test jobs yet.</p>
		{:else}
			<div class="tbl-wrap">
				<table>
					<thead>
						<tr>
							<th>Title</th>
							<th>Created</th>
							<th>YT Status</th>
							<th>YT ID</th>
							<th>Schedule</th>
						</tr>
					</thead>
					<tbody>
						{#each test_ves as v (v.i)}
							<tr>
								<td class="ttl">{v.p}</td>
								<td class="dt">{new Date(v.d).toLocaleString()}</td>
								<td>{v.ys || '—'}</td>
								<td>{#if v.yv}<a href="https://youtube.com/watch?v={v.yv}" target="_blank">{v.yv}</a>{:else}—{/if}</td>
								<td>{v.r > 0 ? `${(v.r / 3600000).toFixed(1)}h` : 'one-shot'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</main>

<style>
	.test { max-width: 720px; margin: 0 auto; padding: 2.5rem 1.5rem; }
	.test h1 { margin-bottom: 1.5rem; }
	.card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.card h2 { font-size: 1.125rem; margin-bottom: 0.5rem; }
	.card p { font-size: 0.875rem; margin-bottom: 0.75rem; }
	.yt-ok { color: #059669; font-size: 0.875rem; margin-bottom: 1rem; }
	.yt-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
	.yt-btn { display: inline-block; padding: 0.5rem 1.25rem; background: #ff0000; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 0.5rem; }
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
	label { font-size: 0.8125rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; color: #555; }
	.lbl { font-size: 0.8125rem; font-weight: 600; display: block; margin-bottom: 0.25rem; color: #555; }
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
	.result { text-align: center; }
	.success { font-size: 1rem; font-weight: 600; color: #059669; }
	.error { font-size: 1rem; font-weight: 600; color: #dc2626; }
	.meta { font-size: 0.8125rem; color: #999; margin-top: 0.5rem; }
	.yt-link-lg {
		display: inline-block;
		margin-top: 0.75rem;
		padding: 0.5rem 1.25rem;
		background: #ff0000;
		color: #fff;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}
	.tbl-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
	th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #555; white-space: nowrap; }
	td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; }
	.ttl { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dt { white-space: nowrap; }
	.empty { font-size: 0.875rem; color: #999; }
	td a { color: #ff0000; text-decoration: none; font-weight: 500; }
	td a:hover { text-decoration: underline; }
</style>

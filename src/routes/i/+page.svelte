<script lang="ts">
	import { untrack } from 'svelte';
	import type { VideoModel } from '$lib/server/openrouter';
	import type { Ve } from '$lib/types/ve';
	let { data } = $props();
	let models = $state(untrack(() => data.models));
	let ves = $state(untrack(() => data.ves as Ve[]));
	let prompt = $state('');
	let model = $state('');
	let resolution = $state('');
	let aspect = $state('');
	let period = $state('86400000');
	let duration = $state('');
	let mode = $state('v');
	let key = $state('');
	let key_msg = $state('');
	let create_msg = $state('');
	let use_custom = $state(false);

	let generating = $state(false);
	let sort_by = $state('cost');
	let sort_dir = $state('asc');
	let yt_upload = $state(false);

	function has_sampling() {
		return ves.some((v: Ve) => v.c === 'sampling');
	}

	let poll = $state(0);
	$effect(() => {
		if (!has_sampling()) return;
		const i = setInterval(async () => {
			const r = await fetch('/api/ves');
			if (r.ok) {
				const d = await r.json();
				ves = d.ves;
				if (!has_sampling()) clearInterval(i);
			}
		}, 3000);
		return () => clearInterval(i);
	});

	function min_cost(m: VideoModel): number {
		if (!m.pricing_skus) return Infinity;
		const vals = Object.entries(m.pricing_skus)
			.filter(([k]) => k.includes('second'))
			.map(([, v]) => Number(v))
			.filter((v) => Number.isFinite(v));
		return vals.length ? Math.min(...vals) : Infinity;
	}

	function model_cost(m: VideoModel): string {
		const c = min_cost(m);
		if (!Number.isFinite(c)) return '';
		const s = c < 0.01 ? c.toFixed(4) : c < 1 ? c.toFixed(3) : c.toFixed(2);
		return `$${s}/s`;
	}

	function sorted_models(): VideoModel[] {
		if (!models) return [];
		const dir = sort_dir === 'asc' ? 1 : -1;
		return [...models].sort((a, b) => {
			if (sort_by === 'cost') {
				const ca = min_cost(a),
					cb = min_cost(b);
				if (ca !== cb) return (ca - cb) * dir;
			}
			return a.name.localeCompare(b.name) * dir;
		});
	}

	function selected_model(): VideoModel | undefined {
		return models?.find((m: VideoModel) => m.id === model);
	}

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
		if (r.ok) {
			key_msg = 'Saved!';
			setTimeout(() => location.reload(), 500);
		} else key_msg = 'Failed to save';
	}

	async function create_ve(e: Event) {
		e.preventDefault();
		const body: Record<string, unknown> = {
			id: crypto.randomUUID(),
			p: prompt,
			m: model,
			r: parseInt(period)
		};
		if (duration) body.g = parseInt(duration);
		if (resolution) body.z = resolution;
		if (yt_upload) body.y = 1;
		const r = await fetch('/api/ves', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (r.ok) {
			create_msg = 'Created!';
			prompt = '';
			model = '';
			duration = '';
			resolution = '';
			setTimeout(() => location.reload(), 300);
		} else create_msg = 'Failed to create';
	}

	async function create_sample() {
		if (!prompt || !model) return;
		generating = true;
		create_msg = '';
		const body: Record<string, unknown> = { p: prompt, m: model, k: mode };
		if (mode === 'p') {
			if (aspect) body.ar = aspect;
		} else {
			if (duration) body.g = parseInt(duration);
			if (resolution) body.z = resolution;
		}
		const r = await fetch('/api/ves/sample', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (r.ok) {
			create_msg = 'Sample queued! It will appear below once ready.';
			setTimeout(() => location.reload(), 1000);
		} else {
			const err = await r.json();
			create_msg = err?.error || 'Failed';
		}
		generating = false;
	}

	async function del(id: string) {
		await fetch('/api/ves', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		location.reload();
	}

	async function pause_toggle(v: Ve) {
		const action = v.c === 'paused' ? 'resume' : 'pause';
		await fetch('/api/ves', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: v.i, action })
		});
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
		<h2>Create a ve</h2>
		<div class="switch" role="tablist" aria-label="media type">
			<button type="button" class={mode === 'v' ? 'sw-active' : 'sw'} onclick={() => (mode = 'v')}
				>Vids</button
			>
			<button type="button" class={mode === 'p' ? 'sw-active' : 'sw'} onclick={() => (mode = 'p')}
				>Pics</button
			>
			<span class="sw-slider" class:sw-p={mode === 'p'}></span>
		</div>
		<form onsubmit={create_ve}>
			<label for="p">Prompt</label>
			<textarea
				id="p"
				bind:value={prompt}
				class="input"
				rows={3}
				placeholder={mode === 'p' ? 'Describe the image...' : 'Describe the video...'}
				required></textarea>

			<label for="m"
				>Model
				{#if data.models?.length}
					<span class="sort-tabs">
						<button
							type="button"
							class={sort_by === 'cost' ? 'st-active' : 'st'}
							onclick={() => (sort_by = 'cost')}>cost</button
						>
						<button
							type="button"
							class={sort_by === 'name' ? 'st-active' : 'st'}
							onclick={() => (sort_by = 'name')}>name</button
						>
						<button
							type="button"
							class="st"
							onclick={() => (sort_dir = sort_dir === 'asc' ? 'desc' : 'asc')}
							>{sort_dir === 'asc' ? '↑' : '↓'}</button
						>
					</span>
				{/if}
			</label>
			{#if data.models?.length}
				<select id="m" bind:value={model} class="input" required>
					<option value="">Select a model...</option>
					{#each sorted_models() as m}
						<option value={m.id}>{m.name}{model_cost(m) ? ` — ${model_cost(m)}` : ''}</option>
					{/each}
				</select>
			{:else}
				<input
					id="m"
					bind:value={model}
					class="input"
					placeholder="Model ID (e.g. openai/4o-video)"
					required
				/>
			{/if}

			{#if model}
				{#if mode === 'p'}
					<label for="ar">Aspect ratio</label>
					<select id="ar" bind:value={aspect} class="input">
						<option value="">Auto</option>
						{#each ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'] as r}
							<option value={r}>{r}</option>
						{/each}
					</select>
				{:else}
					<label for="z">Resolution</label>
					{#if selected_model()?.supported_resolutions?.length}
						<select id="z" bind:value={resolution} class="input">
							<option value="">Auto</option>
							{#each selected_model()!.supported_resolutions! as r}
								<option value={r}>{r}</option>
							{/each}
						</select>
					{:else}
						<input id="z" bind:value={resolution} class="input" placeholder="e.g. 720p" />
					{/if}
				{/if}
			{/if}

			{#if mode === 'v'}
				<label for="g">Duration (seconds, optional)</label>
				<input
					id="g"
					type="number"
					bind:value={duration}
					class="input"
					placeholder="e.g. 30"
					min="1"
				/>
			{/if}

			{#if data.user_data?.a?.y}
				<label class="chk-lbl">
					<input type="checkbox" bind:checked={yt_upload} class="chk" />
					Upload to YouTube when done
				</label>
			{/if}

			<span id="sched-lbl" class="lbl">Schedule</span>
			<div class="periods" role="group" aria-labelledby="sched-lbl">
				<button
					type="button"
					class={period === '3600000' ? 'btn-active' : 'btn-opt'}
					onclick={() => {
						period = '3600000';
						use_custom = false;
					}}>Every hour</button
				>
				<button
					type="button"
					class={period === '86400000' ? 'btn-active' : 'btn-opt'}
					onclick={() => {
						period = '86400000';
						use_custom = false;
					}}>Daily</button
				>
				<button
					type="button"
					class={period === '604800000' ? 'btn-active' : 'btn-opt'}
					onclick={() => {
						period = '604800000';
						use_custom = false;
					}}>Weekly</button
				>
				<button
					type="button"
					class={use_custom ? 'btn-active' : 'btn-opt'}
					onclick={() => (use_custom = true)}>Custom</button
				>
			</div>
			{#if use_custom}
				<input type="number" bind:value={period} class="input" placeholder="Period in ms" />
			{/if}

			<div class="form-actions">
				<button type="submit" class="btn" disabled={!prompt || !model || mode === 'p'}
					>Create</button
				>
				<button
					type="button"
					class="btn-ghost"
					onclick={create_sample}
					disabled={generating || !prompt || !model}
					>{generating ? 'Generating…' : 'Create sample'}</button
				>
			</div>
			{#if create_msg}<p class="msg">{create_msg}</p>{/if}
		</form>
	</section>

	<section class="card">
		<h2>My ves</h2>
		{#if ves.length}
			<div class="ves">
				{#each ves as v}
					<div class="ve-row">
						<div class="ve-top">
							<div class="ve-info">
								<span class="ve-prompt">{v.p.slice(0, 60)}{v.p.length > 60 ? '…' : ''}</span>
								<span class="ve-meta"
									>{v.m}{v.g ? ` · ${v.g}s` : ''}{v.ar ? ` · ${v.ar}` : ''}{v.r === 0
										? ' · sample'
										: ''} · {fmt(v.d)}</span
								>
							</div>
							<div class="ve-right">
								<span class="badge badge-{v.c || 'pending'}">{v.c || 'pending'}</span>
								{#if v.ys}
									<span class="badge badge-yt-{v.ys}">{v.ys}</span>
								{/if}
								{#if v.yv}
									<a href="https://youtube.com/watch?v={v.yv}" target="_blank" class="yt-link">yt</a
									>
								{/if}
								{#if v.r > 0 || v.c === 'paused'}
									<button onclick={() => pause_toggle(v)} class="btn-ghost-sm"
										>{v.c === 'paused' ? '▶' : '⏸'}</button
									>
								{/if}
								<button onclick={() => del(v.i)} class="btn-ghost-sm">×</button>
							</div>
						</div>
						{#if v.w}
							<div class="ve-video">
								{#if v.k === 'p'}
									<img src={v.w} class="media-img" alt={v.p} />
								{:else}
									<video src="/api/ves/{v.i}/video" controls class="video-player"
										><track kind="captions" /></video
									>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty">No ves yet. Create one above.</p>
		{/if}
	</section>

	{#if data.user_data?.a?.y}
		<section class="card yt-card">
			<p class="yt-ok">YouTube connected ✓</p>
		</section>
	{:else}
		<section class="card yt-card">
			<h2>YouTube</h2>
			<p>Connect your YouTube channel to automatically upload videos when they're generated.</p>
			<a href="/yt/auth" class="btn yt-btn">Connect YouTube</a>
		</section>
	{/if}
</main>

<style>
	.dash {
		max-width: 720px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem;
	}
	.dash h1 {
		margin-bottom: 1.5rem;
	}
	.card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.card h2 {
		font-size: 1.125rem;
		margin-bottom: 1rem;
	}
	.card p {
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}
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
	.input:focus {
		outline: none;
		border-color: #111;
	}
	label {
		font-size: 0.8125rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
		color: #555;
	}
	.lbl {
		font-size: 0.8125rem;
		font-weight: 600;
		display: block;
		margin-bottom: 0.25rem;
		color: #555;
	}
	.sort-tabs {
		display: inline-flex;
		gap: 0;
		font-weight: 400;
	}
	.st,
	.st-active {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		cursor: pointer;
		font-family: inherit;
		color: #999;
	}
	.st-active {
		background: #f3f4f6;
		color: #333;
		border-color: #d1d5db;
	}
	.st:first-child,
	.st-active:first-child {
		border-radius: 4px 0 0 4px;
	}
	.st:last-child,
	.st-active:last-child {
		border-radius: 0 4px 4px 0;
		margin-left: -1px;
	}
	.form-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.btn-ghost {
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #555;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-ghost:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}
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
	.btn:hover {
		background: #333;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.periods {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.btn-opt,
	.btn-active {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-active {
		background: #111;
		color: #fff;
		border-color: #111;
	}
	.msg {
		font-size: 0.8125rem;
		color: #059669;
		margin-top: 0.5rem;
	}
	.ves {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.switch {
		position: relative;
		display: inline-flex;
		background: #f3f4f6;
		border-radius: 999px;
		padding: 3px;
		margin-bottom: 1rem;
		width: 180px;
	}
	.sw,
	.sw-active {
		flex: 1;
		position: relative;
		z-index: 1;
		border: none;
		background: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		padding: 0.375rem 0;
		border-radius: 999px;
		color: #6b7280;
	}
	.sw-active {
		color: #fff;
	}
	.sw-slider {
		position: absolute;
		top: 3px;
		left: 3px;
		width: calc(50% - 3px);
		height: calc(100% - 6px);
		background: #111;
		border-radius: 999px;
		transition: transform 0.18s ease;
	}
	.sw-slider.sw-p {
		transform: translateX(100%);
	}
	.media-img {
		width: 100%;
		max-height: 400px;
		border-radius: 8px;
		object-fit: contain;
		background: #f3f4f6;
	}
	.ve-row {
		padding: 0.75rem;
		border: 1px solid #f3f4f6;
		border-radius: 8px;
	}
	.ve-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.ve-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.ve-prompt {
		font-size: 0.875rem;
		font-weight: 500;
	}
	.ve-meta {
		font-size: 0.75rem;
		color: #999;
	}
	.ve-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.badge {
		font-size: 0.6875rem;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		font-weight: 600;
		text-transform: uppercase;
	}
	.badge-active {
		background: #dbeafe;
		color: #1d4ed8;
	}
	.badge-done {
		background: #d1fae5;
		color: #059669;
	}
	.badge-failed {
		background: #fee2e2;
		color: #dc2626;
	}
	.badge-pending {
		background: #f3f4f6;
		color: #6b7280;
	}
	.badge-paused {
		background: #fef3c7;
		color: #b45309;
	}
	.btn-ghost-sm {
		background: none;
		border: none;
		font-size: 1.125rem;
		color: #999;
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}
	.btn-ghost-sm:hover {
		background: #f3f4f6;
		color: #dc2626;
	}
	.empty {
		color: #999;
		font-size: 0.875rem;
	}
	.ve-video {
		grid-column: 1 / -1;
		margin-top: 0.5rem;
	}
	.ve-video video {
		width: 100%;
		max-height: 300px;
		border-radius: 8px;
	}
	.sample-video {
		margin-top: 0.75rem;
	}
	.video-player {
		width: 100%;
		max-height: 400px;
		border-radius: 8px;
	}
	.chk-lbl {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 400;
		color: #333;
		margin-bottom: 0.75rem;
	}
	.chk {
		width: 1rem;
		height: 1rem;
	}
	.yt-card {
		background: #fff;
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}
	.yt-btn {
		display: inline-block;
		padding: 0.5rem 1.25rem;
		background: #ff0000;
		color: #fff;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}
	.yt-ok {
		color: #059669;
		font-size: 0.875rem;
	}
	.yt-link {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		background: #ff0000;
		color: #fff;
		border-radius: 4px;
		text-decoration: none;
		font-weight: 600;
	}
	.badge-yt-uploading {
		background: #fef3c7;
		color: #b45309;
	}
	.badge-yt-live {
		background: #d1fae5;
		color: #059669;
	}
	.badge-yt-yt_failed {
		background: #fee2e2;
		color: #dc2626;
	}
	.badge-yt-pending {
		background: #f3f4f6;
		color: #6b7280;
	}
</style>

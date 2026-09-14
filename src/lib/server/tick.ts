import { get_user } from './user';
import { list_ves, update_ve_job, update_ve_status, update_ve_video_url, update_ve_yt } from './ve';
import { upload_bytes_to_youtube } from './yt';
import { is_due } from './due';
import type { Ve } from '$lib/types/ve';

type Env = {
	ORIGIN?: string;
	INTERNAL_KEY?: string;
	TEST_BUCKET?: { get: (k: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null> };
};

export async function run_tick(env: Env = {}, now = Date.now()): Promise<{ submitted: number; polled: number; uploaded: number }> {
	const ves = await list_ves();
	let submitted = 0;
	let polled = 0;
	let uploaded = 0;
	for (const v of ves) {
		try {
			if (v.x) {
				if (is_due(v, now) && (await upload_test(v, env))) uploaded++;
				continue;
			}
			if (v.j && v.c === 'sampling') {
				if (await poll_one(v)) polled++;
				continue;
			}
			if (v.y && v.w && v.ys !== 'live' && v.ys !== 'uploading') {
				if (await upload_one(v)) uploaded++;
			}
			if (is_due(v, now)) {
				if (await submit_one(v, env)) submitted++;
			}
		} catch (e) {
			console.error('tick ve failed', v.i, e);
		}
	}
	return { submitted, polled, uploaded };
}

async function submit_one(v: Ve, env: Env): Promise<boolean> {
	const u = await get_user({}, v.u);
	if (!u?.a?.o) return false;
	const body: Record<string, unknown> = { model: v.m, prompt: v.p };
	if (v.g) body.duration = v.g;
	if (v.z) body.resolution = v.z;
	if (env.ORIGIN && env.INTERNAL_KEY) body.callback_url = `${env.ORIGIN}/api/internal/ve/hook?k=${env.INTERNAL_KEY}`;
	const r = await fetch('https://openrouter.ai/api/v1/videos', {
		method: 'POST',
		headers: { Authorization: `Bearer ${u.a.o}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!r.ok) {
		await update_ve_status(v.i, 'failed');
		return false;
	}
	const job = (await r.json()) as { id: string };
	await update_ve_job(v.i, job.id);
	await update_ve_status(v.i, 'sampling');
	return true;
}

async function poll_one(v: Ve): Promise<boolean> {
	const u = await get_user({}, v.u);
	if (!u?.a?.o || !v.j) return false;
	const r = await fetch(`https://openrouter.ai/api/v1/videos/${v.j}`, {
		headers: { Authorization: `Bearer ${u.a.o}` }
	});
	if (!r.ok) return false;
	const s = (await r.json()) as { status?: string; unsigned_urls?: string[] };
	if (s.status === 'completed') {
		await update_ve_video_url(v.i, s.unsigned_urls?.[0] || '');
		return true;
	}
	if (s.status === 'failed' || s.status === 'expired' || s.status === 'cancelled') {
		await update_ve_status(v.i, 'failed');
		return true;
	}
	return false;
}

async function upload_one(v: Ve): Promise<boolean> {
	if (!v.w) return false;
	const u = await get_user({}, v.u);
	if (!u?.a?.b || !u.a.c) return false;
	await update_ve_yt(v.i, 'uploading');
	try {
		const r = await fetch('https://api.buffer.com', {
			method: 'POST',
			headers: { Authorization: `Bearer ${u.a.b}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: 'mutation($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }',
				variables: {
					input: {
						text: v.p,
						channelId: u.a.c,
						schedulingType: 'automatic',
						mode: 'shareNow',
						needsApproval: false,
						assets: [{ video: { url: v.w } }],
						metadata: { youtube: { title: v.p.slice(0, 100), privacy: 'public', categoryId: '22', madeForKids: false } }
					}
				}
			})
		});
		const j = (await r.json()) as { errors?: unknown; data?: { createPost?: { post?: { id?: string }; message?: string } } };
		const id = j.data?.createPost?.post?.id;
		if (!r.ok || j.errors || !id || j.data?.createPost?.message) {
			await update_ve_yt(v.i, 'yt_failed');
			return false;
		}
		await update_ve_yt(v.i, 'live', id);
		return true;
	} catch {
		await update_ve_yt(v.i, 'yt_failed');
		return false;
	}
}

async function upload_test(v: Ve, env: Env): Promise<boolean> {
	if (!v.j) return false;
	const u = await get_user({}, v.u);
	if (!u?.a?.y) return false;
	let tok: { refresh_token?: string };
	try {
		tok = JSON.parse(u.a.y);
	} catch {
		return false;
	}
	if (!tok.refresh_token) return false;
	const obj = await env.TEST_BUCKET?.get(v.j);
	if (!obj) return false;
	await update_ve_yt(v.i, 'uploading');
	try {
		const yv = await upload_bytes_to_youtube(tok.refresh_token, await obj.arrayBuffer(), v.p.slice(0, 100), v.p.slice(0, 100));
		await update_ve_yt(v.i, 'live', yv);
		await update_ve_video_url(v.i, '');
		return true;
	} catch {
		await update_ve_yt(v.i, 'yt_failed');
		return false;
	}
}

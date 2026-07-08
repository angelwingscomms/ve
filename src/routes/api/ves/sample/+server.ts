import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_user } from '$lib/server/user';
import { save_ve, update_ve_video_url, update_ve_status, update_ve_yt } from '$lib/server/ve';
import { upload_to_youtube } from '$lib/server/yt';

export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await event.request.json() as { p: string; m: string; g?: number; z?: string; y?: number };
	if (!body.p || !body.m) return json({ error: 'missing fields' }, { status: 400 });

	const u = await get_user({}, event.locals.user.id);
	const api_key = u?.a?.o;
	if (!api_key) return json({ error: 'set your OpenRouter API key first' }, { status: 400 });

	const or_body: Record<string, unknown> = { model: body.m, prompt: body.p };
	if (body.g) or_body.duration = body.g;
	if (body.z) or_body.resolution = body.z;

	const r = await fetch('https://openrouter.ai/api/v1/videos', {
		method: 'POST',
		headers: { Authorization: `Bearer ${api_key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(or_body)
	});

	if (!r.ok) {
		const err = await r.text();
		return json({ error: err }, { status: r.status });
	}

	const job = await r.json();
	const ve_id = crypto.randomUUID();
	await save_ve(ve_id, event.locals.user.id, body.p, body.m, 0, body.g, body.z, job.id, body.y);

	poll_until_done(ve_id, job, api_key, u?.a?.y || '', body.p);

	return json({ id: ve_id });
}

async function poll_until_done(ve_id: string, job: { polling_url?: string; id: string }, api_key: string, yt_token: string, prompt: string) {
	const polling_url = job.polling_url || `https://openrouter.ai/api/v1/videos/${job.id}`;
	const max_wait = 300_000;
	const start = Date.now();
	while (Date.now() - start < max_wait) {
		await new Promise(r => setTimeout(r, 3000));
		try {
			const r = await fetch(polling_url, {
				headers: { Authorization: `Bearer ${api_key}` }
			});
			if (!r.ok) continue;
			const s = await r.json();
			if (s.status === 'completed') {
				const video_url = s.unsigned_urls?.[0] || '';
				await update_ve_video_url(ve_id, video_url);
				if (yt_token && video_url) {
					await update_ve_yt(ve_id, 'uploading');
					try {
						const vid = await upload_to_youtube(yt_token, `/api/ves/${ve_id}/video`, `VE Video: ${prompt.slice(0, 60)}`, `Generated with ${prompt}`);
						await update_ve_yt(ve_id, 'live', vid);
					} catch {
						await update_ve_yt(ve_id, 'yt_failed');
					}
				}
				return;
			}
			if (s.status === 'failed' || s.status === 'expired' || s.status === 'cancelled') {
				await update_ve_status(ve_id, 'failed');
				return;
			}
		} catch {}
	}
	await update_ve_status(ve_id, 'failed');
}
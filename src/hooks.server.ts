import { decode_session } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.platform?.cron) {
		const { list_ves, update_ve_status, update_ve_video_url, increment_ve_retries } = await import('$lib/server/ve');
		const { get_user } = await import('$lib/server/user');
		const ves = await list_ves();
		const now = Date.now();
		const results: Promise<void>[] = [];

		for (const v of ves) {
			if (v.c === 'active' || v.c === 'sampling') continue;

			if (v.r > 0) {
				if (v.l && now - v.l < v.r) continue;
				await update_ve_status(v.i, 'active');

				const u = await get_user({}, v.u);
				const api_key = u?.a?.o;
				if (!api_key) continue;

				results.push(
					(async () => {
						const body: Record<string, unknown> = { model: v.m, prompt: v.p };
						if (v.g) body.duration = v.g;
						if (v.z) body.resolution = v.z;
						for (let att = 1; att <= 5; att++) {
							try {
								const r = await fetch('https://openrouter.ai/api/v1/videos', {
									method: 'POST',
									headers: { Authorization: `Bearer ${api_key}`, 'Content-Type': 'application/json' },
									body: JSON.stringify(body)
								});
								if (r.ok) {
									const job = await r.json();
									if (job.polling_url) {
										const url = await poll_video(job.polling_url, api_key);
										if (url) {
											await update_ve_video_url(v.i, url);
										} else {
											await update_ve_status(v.i, 'failed');
										}
									} else {
										await update_ve_status(v.i, 'done');
									}
									return;
								}
								if (r.status < 500 && r.status !== 429) {
									await update_ve_status(v.i, 'failed');
									return;
								}
							} catch {}
							if (att < 5)
								await new Promise((r) =>
									setTimeout(r, Math.min(2000 * 2 ** (att - 1) + Math.random() * 1000, 60000))
								);
						}
						await update_ve_status(v.i, 'failed');
						await increment_ve_retries(v.i);
					})()
				);
			}
		}

		const samples = ves.filter(v => v.r === 0 && v.c === 'sampling' && v.j);
		for (const v of samples) {
			const u = await get_user({}, v.u);
			const api_key = u?.a?.o;
			if (!api_key) continue;
			results.push(poll_sample(v.i, v.j!, api_key));
		}

		await Promise.allSettled(results);
		return new Response('ok', { status: 200 });
	}

	const session_id = event.cookies.get('session');
	event.locals.user = null;
	if (session_id) {
		const s = await decode_session(session_id);
		if (s) {
			event.locals.user = s.user;
		} else {
			event.cookies.delete('session', { path: '/' });
		}
	}
	return resolve(event);
};

async function poll_video(polling_url: string, api_key: string): Promise<string | null> {
	const start = Date.now();
	const max_wait = 120_000;
	while (Date.now() - start < max_wait) {
		const r = await fetch(polling_url, {
			headers: { Authorization: `Bearer ${api_key}` }
		});
		if (!r.ok) return null;
		const job = await r.json();
		if (job.status === 'completed') return job.unsigned_urls?.[0] || null;
		if (job.status === 'failed') return null;
		await new Promise(r => setTimeout(r, 3000));
	}
	return null;
}

async function poll_sample(ve_id: string, job_id: string, api_key: string): Promise<void> {
	const { update_ve_video_url, update_ve_status } = await import('$lib/server/ve');
	const url = await poll_video(`https://openrouter.ai/api/v1/videos/${job_id}`, api_key);
	if (url) {
		await update_ve_video_url(ve_id, url);
	} else {
		await update_ve_status(ve_id, 'failed');
	}
}
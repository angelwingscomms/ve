import { decode_session } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.platform?.cron) {
		const { list_vids, update_vid_status, increment_vid_retries } = await import('$lib/server/vid');
		const { get_user } = await import('$lib/server/user');
		const vids = await list_vids();
		const now = Date.now();
		const results: Promise<void>[] = [];

		for (const v of vids) {
			if (v.c === 'active' || (v.l && now - v.l < v.r)) continue;
			await update_vid_status(v.i, 'active');

			const u = await get_user({}, v.u);
			const api_key = u?.a?.o;
			if (!api_key) continue;

			results.push(
				(async () => {
					for (let att = 1; att <= 5; att++) {
						try {
							const r = await fetch('https://openrouter.ai/api/v1/video', {
								method: 'POST',
								headers: { Authorization: `Bearer ${api_key}`, 'Content-Type': 'application/json' },
								body: JSON.stringify({ model: v.m, prompt: v.p })
							});
							if (r.ok) {
								await update_vid_status(v.i, 'done');
								return;
							}
							if (r.status < 500 && r.status !== 429) {
								await update_vid_status(v.i, 'failed');
								return;
							}
						} catch {}
						if (att < 5)
							await new Promise((r) =>
								setTimeout(r, Math.min(2000 * 2 ** (att - 1) + Math.random() * 1000, 60000))
							);
					}
					await update_vid_status(v.i, 'failed');
					await increment_vid_retries(v.i);
				})()
			);
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

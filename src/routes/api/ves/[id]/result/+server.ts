import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve, update_ve_video_url, update_ve_status, update_ve_job } from '$lib/server/ve';

// Client-authenticated endpoint used by the local BYOK service worker to
// persist generation results. Guarded by session auth + ownership.
export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });

	const id = event.params.id;
	if (!id) return json({ error: 'missing id' }, { status: 400 });
	const v = await get_ve(id);
	if (!v || v.u !== event.locals.user.id) return json({ error: 'not found' }, { status: 404 });

	const body = (await event.request.json()) as { w?: string; c?: string; j?: string };
	if (body.w !== undefined) await update_ve_video_url(id, body.w);
	if (body.c !== undefined) await update_ve_status(id, body.c);
	if (body.j !== undefined) await update_ve_job(id, body.j);
	return json({ ok: true });
}

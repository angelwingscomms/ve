import { get_ve } from '$lib/server/ve';
import { get_user } from '$lib/server/user';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return new Response('unauthorized', { status: 401 });

	const v = await get_ve(event.params.id);
	if (!v || v.u !== event.locals.user.id) return new Response('not found', { status: 404 });
	if (!v.w) return new Response('no video', { status: 404 });

	const u = await get_user({}, event.locals.user.id);
	const api_key = u?.a?.o;
	if (!api_key) return new Response('no api key', { status: 400 });

	const r = await fetch(v.w, {
		headers: { Authorization: `Bearer ${api_key}` }
	});

	if (!r.ok) return new Response('fetch failed', { status: 502 });

	return new Response(r.body, {
		headers: {
			'Content-Type': r.headers.get('Content-Type') || 'video/mp4',
			'Content-Length': r.headers.get('Content-Length') || '',
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
}
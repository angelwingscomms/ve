import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { update_ve_video_url } from '$lib/server/ve';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const b = await event.request.json() as { i: string; w: string };
	if (!b.i) return json({ error: 'missing id' }, { status: 400 });
	await update_ve_video_url(b.i, b.w || '');
	return json({ ok: true });
}

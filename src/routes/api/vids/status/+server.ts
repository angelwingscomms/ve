import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { update_vid_status, increment_vid_retries } from '$lib/server/vid';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const body = (await event.request.json()) as { id: string; c: string };
	await update_vid_status(body.id, body.c);
	return json({ ok: true });
}

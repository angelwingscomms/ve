import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve_by_job, update_ve_status, update_ve_video_url } from '$lib/server/ve';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key') || event.url.searchParams.get('k');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const body = (await event.request.json()) as { data?: { id?: string; status?: string; unsigned_urls?: string[] } };
	const j = body.data?.id;
	if (!j) return json({ error: 'missing job' }, { status: 400 });
	const v = await get_ve_by_job(j);
	if (!v) return json({ error: 'not found' }, { status: 404 });
	if (body.data?.status === 'completed') {
		await update_ve_video_url(v.i, body.data.unsigned_urls?.[0] || '');
	} else {
		await update_ve_status(v.i, 'failed');
	}
	return new Response(null, { status: 204 });
}

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve_by_job } from '$lib/server/ve';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key') || event.url.searchParams.get('k');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const body = (await event.request.json()) as { data?: { id?: string } };
	const j = body.data?.id;
	if (!j) return json({ error: 'missing job' }, { status: 400 });
	const v = await get_ve_by_job(j);
	if (!v?.n) return json({ error: 'not found' }, { status: 404 });
	const env = event.platform?.env;
	if (!env?.VIDEO_WORKFLOW) return json({ error: 'no workflow' }, { status: 500 });
	await env.VIDEO_WORKFLOW.get(v.n).sendEvent({ type: 'or', payload: body });
	return new Response(null, { status: 204 });
}

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { run_tick } from '$lib/server/tick';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const n = await run_tick(event.platform?.env ?? {});
	return json({ ok: true, n });
}

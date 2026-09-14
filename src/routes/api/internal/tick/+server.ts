import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { run_tick } from '$lib/server/tick';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const env = event.platform?.env;
	const n = await run_tick({ ORIGIN: env?.ORIGIN, INTERNAL_KEY: env?.INTERNAL_KEY, TEST_BUCKET: env?.TEST_BUCKET });
	return json({ ok: true, n });
}

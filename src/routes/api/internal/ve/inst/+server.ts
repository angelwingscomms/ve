import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { add_ve_inst } from '$lib/server/ve';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const b = await event.request.json() as { i: string; n: string };
	if (!b.i || !b.n) return json({ error: 'missing fields' }, { status: 400 });
	await add_ve_inst(b.i, b.n);
	return json({ ok: true });
}
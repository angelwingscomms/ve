import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { add_ve_inst, get_ve, update_ve_job } from '$lib/server/ve';
import { INTERNAL_KEY } from '$env/static/private';

export async function GET(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const i = event.url.searchParams.get('i');
	if (!i) return json({ error: 'missing id' }, { status: 400 });
	const v = await get_ve(i);
	if (!v) return json({ error: 'not found' }, { status: 404 });
	return json({ p: v.p, m: v.m, g: v.g, z: v.z, ar: v.ar, r: v.r, y: v.y, x: v.x, j: v.j, k: v.k });
}

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const b = (await event.request.json()) as { i?: string; n?: string; j?: string };
	if (!b.i) return json({ error: 'missing id' }, { status: 400 });
	if (b.n) await add_ve_inst(b.i, b.n);
	if (b.j) await update_ve_job(b.i, b.j);
	return json({ ok: true });
}

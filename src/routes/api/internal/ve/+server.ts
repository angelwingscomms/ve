import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve } from '$lib/server/ve';
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

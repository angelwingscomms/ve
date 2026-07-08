import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve } from '$lib/server/ve';
import { get_user } from '$lib/server/user';
import { INTERNAL_KEY } from '$env/static/private';

export async function GET(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const i = event.url.searchParams.get('i');
	if (!i) return json({ error: 'missing id' }, { status: 400 });
	const v = await get_ve(i);
	if (!v) return json({ error: 'not found' }, { status: 404 });
	const u = await get_user({}, v.u);
	if (!u?.a?.o) return json({ error: 'no key' }, { status: 404 });
	return json({ a_o: u.a.o });
}

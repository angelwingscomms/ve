import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { list_test_ves } from '$lib/server/ve';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const ves = await list_test_ves(event.locals.user.id);
	return json(ves);
}

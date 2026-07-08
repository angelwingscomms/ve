import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { save_ve, list_ves, delete_ve, get_ve } from '$lib/server/ve';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const id = event.url.searchParams.get('id');
	if (id) {
		const v = await get_ve(id);
		if (!v || v.u !== event.locals.user.id) return json({ error: 'not found' }, { status: 404 });
		return json({ ve: v });
	}
	const ves = await list_ves(event.locals.user.id);
	return json({ ves });
}

export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = await event.request.json() as { id: string; p: string; m: string; g?: number; r: number; z?: string };
	if (!body.id || !body.p || !body.m) return json({ error: 'missing fields' }, { status: 400 });
	await save_ve(body.id, event.locals.user.id, body.p, body.m, body.r || 86400000, body.g, body.z);
	const v = await get_ve(body.id);
	return json({ ve: v });
}

export async function DELETE(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = await event.request.json() as { id: string };
	if (!body.id) return json({ error: 'missing id' }, { status: 400 });
	await delete_ve(body.id);
	return json({ ok: true });
}
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { save_ve, list_ves, delete_ve, get_ve, update_ve_pause } from '$lib/server/ve';

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
	const body = await event.request.json() as { id: string; p: string; m: string; g?: number; r: number; z?: string; y?: number; local?: boolean };
	if (!body.id || !body.p || !body.m) return json({ error: 'missing fields' }, { status: 400 });
	await save_ve(body.id, event.locals.user.id, body.p, body.m, body.r || 86400000, body.g, body.z, undefined, body.y);

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

export async function PATCH(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = await event.request.json() as { id: string; action: 'pause' | 'resume' };
	if (!body.id || !body.action) return json({ error: 'missing id or action' }, { status: 400 });
	const v = await get_ve(body.id);
	if (!v || v.u !== event.locals.user.id) return json({ error: 'not found' }, { status: 404 });

	await update_ve_pause(body.id, body.action === 'pause');

	const updated = await get_ve(body.id);
	return json({ ve: updated });
}
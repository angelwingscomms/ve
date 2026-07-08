import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { save_vid, list_vids, delete_vid, get_vid } from '$lib/server/vid';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const vids = await list_vids(event.locals.user.id);
	return json({ vids });
}

export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = (await event.request.json()) as { id: string; p: string; m: string; r: number };
	if (!body.id || !body.p || !body.m) return json({ error: 'missing fields' }, { status: 400 });
	await save_vid(body.id, event.locals.user.id, body.p, body.m, body.r || 86400000);
	const v = await get_vid(body.id);
	return json({ vid: v });
}

export async function DELETE(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = (await event.request.json()) as { id: string };
	if (!body.id) return json({ error: 'missing id' }, { status: 400 });
	await delete_vid(body.id);
	return json({ ok: true });
}

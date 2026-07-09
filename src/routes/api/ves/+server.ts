import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { save_ve, list_ves, delete_ve, get_ve, add_ve_inst } from '$lib/server/ve';
import { get_user } from '$lib/server/user';

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
	const body = await event.request.json() as { id: string; p: string; m: string; g?: number; r: number; z?: string; y?: number };
	if (!body.id || !body.p || !body.m) return json({ error: 'missing fields' }, { status: 400 });
	await save_ve(body.id, event.locals.user.id, body.p, body.m, body.r || 86400000, body.g, body.z, undefined, body.y);

if (body.r > 0) {
			try {
				const u = await get_user({}, event.locals.user.id);
				const env = event.platform?.env as
					| { VIDEO_WORKFLOW?: { create: (o: { id: string; params: { ve_id: string } }) => Promise<{ id: string }> } }
					| undefined;
				if (u?.a?.o && env?.VIDEO_WORKFLOW) {
					const inst = await env.VIDEO_WORKFLOW.create({
						id: `ve_${body.id}_${Date.now()}`,
						params: { ve_id: body.id }
					});
					await add_ve_inst(body.id, inst.id);
				}
			} catch (e) {
				console.error('workflow start failed', e);
			}
		}

	const v = await get_ve(body.id);
	return json({ ve: v });
}

export async function DELETE(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = await event.request.json() as { id: string };
	if (!body.id) return json({ error: 'missing id' }, { status: 400 });
	const v = await get_ve(body.id);
	if (v?.n) {
		try {
			const env = event.platform?.env as
				| { VIDEO_WORKFLOW?: { get: (id: string) => { terminate: () => Promise<void> } } }
				| undefined;
			if (env?.VIDEO_WORKFLOW) {
				await env.VIDEO_WORKFLOW.get(v.n).terminate();
			}
		} catch (e) {
			console.error('workflow terminate failed', e);
		}
	}
	await delete_ve(body.id);
	return json({ ok: true });
}
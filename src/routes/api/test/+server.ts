import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_user } from '$lib/server/user';
import { save_ve } from '$lib/server/ve';

export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });

	const u = await get_user({}, event.locals.user.id);
	if (!u?.a?.y) return json({ error: 'no yt token' }, { status: 400 });
	let tok: { refresh_token?: string };
	try { tok = JSON.parse(u.a.y); } catch { return json({ error: 'bad yt token' }, { status: 400 }); }
	if (!tok.refresh_token) return json({ error: 'no refresh' }, { status: 400 });

	const form = await event.request.formData();
	const file = form.get('video') as File | null;
	if (!file) return json({ error: 'no video' }, { status: 400 });
	const period = parseInt((form.get('period') as string) || '0');

	const env = event.platform?.env as { TEST_BUCKET?: { put: (k: string, d: ArrayBuffer, o?: { httpMetadata?: { contentType?: string } }) => Promise<void> }; ORIGIN?: string; VIDEO_WORKFLOW?: { create: (o: { id: string; params: { ve_id: string } }) => Promise<{ id: string }> } };
	const r2_key = `test/${event.locals.user.id}/${crypto.randomUUID()}`;
	const buf = await file.arrayBuffer();
	await env.TEST_BUCKET?.put(r2_key, buf, { httpMetadata: { contentType: file.type || 'video/mp4' } });

	const ve_id = crypto.randomUUID();
	await save_ve(ve_id, event.locals.user.id, 'test upload', '', period, undefined, undefined, r2_key, undefined, 1);

	if (period > 0) {
		const inst = await env.VIDEO_WORKFLOW?.create({ id: `ve_${ve_id}_${Date.now()}`, params: { ve_id } });
		return json({ ok: true, ve_id, workflow_id: inst?.id });
	}

	return json({ ok: true, ve_id });
}

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_user } from '$lib/server/user';
import { upload_bytes_to_youtube } from '$lib/server/yt';

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
	const title = (form.get('title') as string) || `Test upload at ${new Date().toISOString()}`;
	const period = parseInt((form.get('period') as string) || '0');

	const env = event.platform?.env as { TEST_BUCKET?: { put: (k: string, d: ArrayBuffer, o?: { httpMetadata?: { contentType?: string } }) => Promise<void> }; ORIGIN?: string; TEST_WORKFLOW?: { create: (o: { id: string; params: { r2_key: string; title: string; period: number } }) => Promise<{ id: string }> } };
	const r2_key = `test/${event.locals.user.id}/${crypto.randomUUID()}`;
	const buf = await file.arrayBuffer();
	await env.TEST_BUCKET?.put(r2_key, buf, { httpMetadata: { contentType: file.type || 'video/mp4' } });

	const yv = await upload_bytes_to_youtube(tok.refresh_token, buf, title, title);

	if (period > 0) {
		const inst = await env.TEST_WORKFLOW?.create({ id: `test_${event.locals.user.id}_${Date.now()}`, params: { r2_key, title, period } });
		return json({ ok: true, yv, workflow_id: inst?.id, next_upload_at: Date.now() + period });
	}

	return json({ ok: true, yv });
}

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve, update_ve_yt, update_ve_video_url } from '$lib/server/ve';
import { get_user } from '$lib/server/user';
import { upload_bytes_to_youtube } from '$lib/server/yt';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const b = await event.request.json() as { i: string };
	if (!b.i) return json({ error: 'missing id' }, { status: 400 });

	const v = await get_ve(b.i);
	if (!v || !v.j) return json({ error: 'no video key' }, { status: 400 });

	const env = event.platform?.env as { TEST_BUCKET?: { get: (k: string) => Promise<{ body: ReadableStream; arrayBuffer: () => Promise<ArrayBuffer> } | null> } };
	const obj = await env.TEST_BUCKET?.get(v.j);
	if (!obj) return json({ error: 'r2 not found' }, { status: 404 });

	const u = await get_user({}, v.u);
	if (!u?.a?.y) return json({ error: 'no yt' }, { status: 400 });
	let tok: { refresh_token?: string };
	try { tok = JSON.parse(u.a.y); } catch { return json({ error: 'bad yt token' }, { status: 400 }); }
	if (!tok.refresh_token) return json({ error: 'no refresh' }, { status: 400 });

	const buf = await obj.arrayBuffer();
	const title = v.p.slice(0, 100);
	try {
		await update_ve_yt(b.i, 'uploading');
		const yv = await upload_bytes_to_youtube(tok.refresh_token, buf, title, title);
		await update_ve_yt(b.i, 'live', yv);
		await update_ve_video_url(b.i, '');
		return json({ ok: true, yv });
	} catch (e) {
		await update_ve_yt(b.i, 'yt_failed');
		return json({ ok: false, error: String(e) });
	}
}

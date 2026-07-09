import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_user } from '$lib/server/user';
import { upload_bytes_to_youtube } from '$lib/server/yt';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });

	const b = await event.request.json() as { r2_key: string; title: string };
	const parts = b.r2_key.split('/');
	if (parts.length < 3 || parts[0] !== 'test') return json({ error: 'bad key' }, { status: 400 });
	const user_id = parts[1];

	const u = await get_user({}, user_id);
	if (!u?.a?.y) return json({ error: 'no yt' }, { status: 400 });
	let tok: { refresh_token?: string };
	try { tok = JSON.parse(u.a.y); } catch { return json({ error: 'bad yt token' }, { status: 400 }); }
	if (!tok.refresh_token) return json({ error: 'no refresh' }, { status: 400 });

	const env = event.platform?.env as { TEST_BUCKET?: { get: (k: string) => Promise<{ body: ReadableStream; arrayBuffer: () => Promise<ArrayBuffer> } | null> } };
	const obj = await env.TEST_BUCKET?.get(b.r2_key);
	if (!obj) return json({ error: 'not found' }, { status: 404 });
	const buf = await obj.arrayBuffer();

	const yv = await upload_bytes_to_youtube(tok.refresh_token, buf, b.title, b.title);
	return json({ ok: true, yv });
}

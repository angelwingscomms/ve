import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_ve, update_ve_yt } from '$lib/server/ve';
import { get_user } from '$lib/server/user';
import { upload_to_youtube } from '$lib/server/yt';
import { INTERNAL_KEY } from '$env/static/private';

export async function POST(event: RequestEvent): Promise<Response> {
	const auth = event.request.headers.get('x-internal-key');
	if (auth !== INTERNAL_KEY) return json({ error: 'unauthorized' }, { status: 401 });
	const b = await event.request.json() as { i: string };
	if (!b.i) return json({ error: 'missing id' }, { status: 400 });

	const v = await get_ve(b.i);
	if (!v || !v.w) return json({ ok: false, error: 'no video' });

	const u = await get_user({}, v.u);
	if (!u?.a?.y) return json({ ok: false, error: 'no yt' });

	let tok: { refresh_token?: string };
	try {
		tok = JSON.parse(u.a.y);
	} catch {
		await update_ve_yt(b.i, 'yt_failed');
		return json({ ok: false, error: 'bad yt token' });
	}
	if (!tok.refresh_token) {
		await update_ve_yt(b.i, 'yt_failed');
		return json({ ok: false, error: 'no refresh' });
	}

	try {
		await update_ve_yt(b.i, 'uploading');
		const yv = await upload_to_youtube(tok.refresh_token, v.w, v.p.slice(0, 100), v.p, u.a?.o);
		await update_ve_yt(b.i, 'live', yv);
		return json({ ok: true, yv });
	} catch (e) {
		await update_ve_yt(b.i, 'yt_failed');
		return json({ ok: false, error: String(e) });
	}
}

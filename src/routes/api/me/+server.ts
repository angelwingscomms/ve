import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_user, update_user_api_keys } from '$lib/server/user';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ user: null });
	const u = await get_user(event, event.locals.user.id);
	return json({
		user: u ?? {
			s: 'u',
			n: event.locals.user.name,
			p: event.locals.user.picture,
			m: event.locals.user.email,
			d: 0
		}
	});
}

export async function PATCH(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const body = (await event.request.json()) as { a?: Record<string, string> };
	if (body.a) {
		const trimmed: Record<string, string> = {};
		for (const [k, v] of Object.entries(body.a)) trimmed[k] = (v || '').trim();
		if (trimmed.o) {
			try {
				const vr = await fetch('https://openrouter.ai/api/v1/key', {
					headers: { Authorization: `Bearer ${trimmed.o}` }
				});
				if (vr.status === 401)
					return json({ error: 'Invalid OpenRouter API key' }, { status: 400 });
			} catch {}
		}
		if (trimmed.b) {
			try {
				const vr = await fetch('https://api.buffer.com', {
					method: 'POST',
					headers: { Authorization: `Bearer ${trimmed.b}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: '{ account { id } }' })
				});
				if (vr.status === 401) return json({ error: 'Invalid Buffer API key' }, { status: 400 });
			} catch {}
		}
		await update_user_api_keys(event, event.locals.user.id, trimmed as any);
	}
	const u = await get_user(event, event.locals.user.id);
	return json({ user: u });
}

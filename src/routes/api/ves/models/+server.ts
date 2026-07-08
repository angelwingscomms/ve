import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_video_models } from '$lib/server/openrouter';
import { get_user } from '$lib/server/user';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const u = await get_user(event, event.locals.user.id);
	const key = u?.a?.o;
	if (!key) return json({ error: 'no openrouter key set' }, { status: 400 });
	try {
		const models = await get_video_models(key);
		return json({ models });
	} catch (e) {
		return json({ error: String(e) }, { status: 502 });
	}
}

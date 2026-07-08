import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { v4 } from 'uuid';
import { get_user } from '$lib/server/user';
import { save_ve } from '$lib/server/ve';

export async function POST(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await event.request.json() as { p: string; m: string; g?: number; z?: string };
	if (!body.p || !body.m) return json({ error: 'missing fields' }, { status: 400 });

	const u = await get_user({}, event.locals.user.id);
	const api_key = u?.a?.o;
	if (!api_key) return json({ error: 'set your OpenRouter API key first' }, { status: 400 });

	const or_body: Record<string, unknown> = { model: body.m, prompt: body.p };
	if (body.g) or_body.duration = body.g;
	if (body.z) or_body.resolution = body.z;

	const r = await fetch('https://openrouter.ai/api/v1/videos', {
		method: 'POST',
		headers: { Authorization: `Bearer ${api_key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(or_body)
	});

	if (!r.ok) {
		const err = await r.text();
		return json({ error: err }, { status: r.status });
	}

	const job = await r.json();
	const ve_id = crypto.randomUUID();
	await save_ve(ve_id, event.locals.user.id, body.p, body.m, 0, body.g, body.z, job.id);

	return json({ id: ve_id });
}
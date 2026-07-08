import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { get_user } from '$lib/server/user';

async function poll(polling_url: string, api_key: string): Promise<string | null> {
	const start = Date.now();
	const max_wait = 120_000;
	while (Date.now() - start < max_wait) {
		const r = await fetch(polling_url, {
			headers: { Authorization: `Bearer ${api_key}` }
		});
		if (!r.ok) return null;
		const job = await r.json();
		if (job.status === 'completed') return job.unsigned_urls?.[0] || null;
		if (job.status === 'failed') return null;
		await new Promise(r => setTimeout(r, 3000));
	}
	return null;
}

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
	if (!job.polling_url) return json({ error: 'no polling_url in response' }, { status: 500 });

	const url = await poll(job.polling_url, api_key);
	if (!url) return json({ error: 'generation failed or timed out' }, { status: 500 });

	return json({ url });
}

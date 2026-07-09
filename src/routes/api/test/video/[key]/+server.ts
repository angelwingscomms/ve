import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return json({ error: 'unauthorized' }, { status: 401 });
	const key = event.params.key;
	if (!key || !key.startsWith(`test/${event.locals.user.id}/`)) return json({ error: 'not found' }, { status: 404 });

	const env = event.platform?.env as { TEST_BUCKET?: { get: (k: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null> } };
	const obj = await env.TEST_BUCKET?.get(key);
	if (!obj) return json({ error: 'not found' }, { status: 404 });

	return new Response(obj.body, {
		headers: { 'Content-Type': obj.httpMetadata?.contentType || 'video/mp4', 'Cache-Control': 'public, max-age=31536000, immutable' }
	});
}

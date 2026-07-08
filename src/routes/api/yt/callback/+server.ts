import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { GOOGLE_ID, GOOGLE_SECRET, ORIGIN } from '$env/static/private';
import { get_user } from '$lib/server/user';

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	if (!code || !state) return new Response('missing params', { status: 400 });

	const r = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: GOOGLE_ID,
			client_secret: GOOGLE_SECRET,
			redirect_uri: `${ORIGIN}/api/yt/callback`,
			grant_type: 'authorization_code'
		})
	});

	if (!r.ok) {
		const e = await r.text();
		return new Response(`token exchange failed: ${e}`, { status: 500 });
	}

	const t = await r.json();
	const u = await get_user({}, state);
	if (!u) return new Response('user not found', { status: 404 });

	const { update_user_api_keys } = await import('$lib/server/user');
	await update_user_api_keys({}, state, { ...u.a, y: JSON.stringify(t) });

	redirect(302, '/i#ytok');
}
import { Google, generateState, generateCodeVerifier } from 'arctic';
import { GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

export function GET(event: RequestEvent): Response {
	const state = generateState();
	const verifier = generateCodeVerifier();
	const google = new Google(GOOGLE_ID, GOOGLE_SECRET, new URL('/google', event.url.origin).toString());
	const redirect_uri = google.createAuthorizationURL(state, verifier, ['openid', 'profile', 'email']).toString();
	event.cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 600,
		sameSite: 'lax'
	});
	event.cookies.set('oauth_verifier', verifier, {
		path: '/',
		httpOnly: true,
		maxAge: 600,
		sameSite: 'lax'
	});
	return new Response(null, {
		status: 302,
		headers: { Location: redirect_uri }
	});
}

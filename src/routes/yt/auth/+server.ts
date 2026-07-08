import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { GOOGLE_ID, ORIGIN } from '$env/static/private';

export async function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) return new Response('unauthorized', { status: 401 });

	const cb = `${ORIGIN}/yt/callback`;
	const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_ID}&redirect_uri=${encodeURIComponent(cb)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}&access_type=offline&prompt=consent&state=${event.locals.user.id}`;

	redirect(302, url);
}
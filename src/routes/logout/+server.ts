import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function POST(event: RequestEvent): Response {
	event.cookies.delete('session', { path: '/' });
	return redirect(302, '/');
}

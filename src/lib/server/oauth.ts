import { Google, generateState, generateCodeVerifier } from 'arctic';
import { GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';
import { google_redirect_uri } from '$lib/util/oauth/google_redirect_uri';

export function google_client(origin: string): Google {
	return new Google(GOOGLE_ID, GOOGLE_SECRET, google_redirect_uri(origin));
}
export { generateState, generateCodeVerifier };

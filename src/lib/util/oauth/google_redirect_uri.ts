export function google_redirect_uri(origin: string): string {
	return new URL('/google', origin).toString();
}

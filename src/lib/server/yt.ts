import { YT_GOOGLE_ID, YT_GOOGLE_SECRET } from '$env/static/private';

async function get_access_token(refresh_token: string): Promise<string> {
	const r = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			refresh_token,
			client_id: YT_GOOGLE_ID,
			client_secret: YT_GOOGLE_SECRET,
			grant_type: 'refresh_token'
		})
	});
	if (!r.ok) throw new Error('token refresh failed');
	const t = await r.json();
	return t.access_token;
}

export async function upload_to_youtube(
	refresh_token: string,
	video_url: string,
	title: string,
	description: string
): Promise<string> {
	const token = await get_access_token(refresh_token);

	const body = JSON.stringify({
		snippet: { title, description },
		status: { privacyStatus: 'private', selfDeclaredMadeForKids: false }
	});

	const r0 = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json; charset=UTF-8',
			'X-Upload-Content-Length': '0',
			'X-Upload-Content-Type': 'video/mp4'
		},
		body
	});

	if (!r0.ok) {
		const e = await r0.text();
		throw new Error(`resumable init failed: ${e}`);
	}

	const upload_url = r0.headers.get('Location');
	if (!upload_url) throw new Error('no Location header');

	const v = await fetch(video_url, {
		headers: { Authorization: `Bearer ${refresh_token}` }
	});
	if (!v.ok) throw new Error('fetch video failed');
	const buf = await v.arrayBuffer();

	const r1 = await fetch(upload_url, {
		method: 'PUT',
		headers: {
			'Content-Length': String(buf.byteLength),
			'Content-Type': 'video/mp4'
		},
		body: buf
	});

	if (!r1.ok) {
		const e = await r1.text();
		throw new Error(`upload failed: ${e}`);
	}

	const result = await r1.json();
	return result.id;
}
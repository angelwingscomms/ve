import { GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';

async function get_access_token(refresh_token: string): Promise<string> {
	const r = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			refresh_token,
			client_id: GOOGLE_ID,
			client_secret: GOOGLE_SECRET,
			grant_type: 'refresh_token'
		})
	});
	if (!r.ok) throw new Error('token refresh failed');
	const t = (await r.json()) as { access_token: string };
	return t.access_token;
}

async function init_resumable(token: string, title: string, description: string): Promise<string> {
	const r0 = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json; charset=UTF-8',
			'X-Upload-Content-Length': '0',
			'X-Upload-Content-Type': 'video/mp4'
		},
		body: JSON.stringify({
			snippet: { title, description },
			status: { privacyStatus: 'private', selfDeclaredMadeForKids: false }
		})
	});
	if (!r0.ok) {
		const e = await r0.text();
		throw new Error(`resumable init failed: ${e}`);
	}
	const upload_url = r0.headers.get('Location');
	if (!upload_url) throw new Error('no Location header');
	return upload_url;
}

export async function upload_to_youtube(
	refresh_token: string,
	video_url: string,
	title: string,
	description: string,
	or_key?: string
): Promise<string> {
	const token = await get_access_token(refresh_token);
	const v = await fetch(video_url, or_key ? { headers: { Authorization: `Bearer ${or_key}` } } : {});
	if (!v.ok) throw new Error('fetch video failed');
	const buf = await v.arrayBuffer();
	const upload_url = await init_resumable(token, title, description);
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
	const result = (await r1.json()) as { id: string };
	return result.id;
}

export async function upload_bytes_to_youtube(
	refresh_token: string,
	video_bytes: ArrayBuffer,
	title: string,
	description: string,
): Promise<string> {
	const token = await get_access_token(refresh_token);
	const upload_url = await init_resumable(token, title, description);
	const r1 = await fetch(upload_url, {
		method: 'PUT',
		headers: {
			'Content-Length': String(video_bytes.byteLength),
			'Content-Type': 'video/mp4'
		},
		body: video_bytes
	});
	if (!r1.ok) {
		const e = await r1.text();
		throw new Error(`upload failed: ${e}`);
	}
	const result = (await r1.json()) as { id: string };
	return result.id;
}

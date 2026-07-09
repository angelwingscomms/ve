import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/yt', () => ({
	upload_to_youtube: vi.fn(),
	upload_bytes_to_youtube: vi.fn(),
}));

vi.mock('$lib/server/user', () => ({
	get_user: vi.fn(),
}));

import { get_user } from '$lib/server/user';
import { upload_bytes_to_youtube } from '$lib/server/yt';

const mockUser = (yt_token?: string) => ({
	s: 'u', n: 'Test', d: Date.now(),
	a: yt_token ? { y: yt_token } : {},
});

function mockToken(refresh = 'rt123') {
	return JSON.stringify({ refresh_token: refresh, access_token: 'at123', expires_in: 3600 });
}

function makeForm(fields: Record<string, string | { name: string; type: string; data: Uint8Array }>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) {
		if (typeof v === 'string') fd.append(k, v);
		else fd.append(k, new Blob([v.data], { type: v.type }), v.name);
	}
	return fd;
}

function mockEvent(opts?: {
	user?: { id: string; name: string } | null;
	formData?: FormData;
	platform?: Record<string, unknown>;
}) {
	const user = 'user' in (opts ?? {}) ? opts!.user : { id: 'user1', name: 'Test' };
	const platform = opts?.platform ?? {
		env: {
			TEST_BUCKET: { put: vi.fn().mockResolvedValue(undefined) },
			TEST_WORKFLOW: { create: vi.fn().mockResolvedValue({ id: 'wf123' }) },
			ORIGIN: 'http://localhost',
		},
		ctx: {} as any,
		caches: {} as any,
	};

	return {
		locals: { user },
		request: {
			formData: vi.fn().mockResolvedValue(opts?.formData ?? new FormData()),
		} as any,
		platform,
	} as any;
}

describe('POST /api/test', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const event = mockEvent({ user: null });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(401);
		const b = await r.json();
		expect(b.error).toBe('unauthorized');
	});

	it('returns 400 when no yt token', async () => {
		vi.mocked(get_user).mockResolvedValue(mockUser() as any);
		const event = mockEvent();
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(400);
		const b = await r.json();
		expect(b.error).toBe('no yt token');
	});

	it('returns 400 when bad yt token', async () => {
		vi.mocked(get_user).mockResolvedValue(mockUser('not-json') as any);
		const event = mockEvent();
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(400);
		const b = await r.json();
		expect(b.error).toBe('bad yt token');
	});

	it('returns 400 when no video file', async () => {
		vi.mocked(get_user).mockResolvedValue(mockUser(mockToken()) as any);
		const event = mockEvent();
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(400);
		const b = await r.json();
		expect(b.error).toBe('no video');
	});

	it('uploads to yt and returns yv for one-shot', async () => {
		vi.mocked(get_user).mockResolvedValue(mockUser(mockToken()) as any);
		vi.mocked(upload_bytes_to_youtube).mockResolvedValue('yt12345');
		const fd = makeForm({
			video: { name: 'test.mp4', type: 'video/mp4', data: new Uint8Array([0, 1, 2]) },
			title: 'My test',
		});
		const event = mockEvent({ formData: fd });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.ok).toBe(true);
		expect(b.yv).toBe('yt12345');
		expect(b.workflow_id).toBeUndefined();
		expect(upload_bytes_to_youtube).toHaveBeenCalled();
	});

	it('starts workflow when period set', async () => {
		vi.mocked(get_user).mockResolvedValue(mockUser(mockToken()) as any);
		vi.mocked(upload_bytes_to_youtube).mockResolvedValue('yt67890');
		const fd = makeForm({
			video: { name: 'test.mp4', type: 'video/mp4', data: new Uint8Array([3, 4, 5]) },
			period: '3600000',
		});
		const event = mockEvent({ formData: fd });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.ok).toBe(true);
		expect(b.yv).toBe('yt67890');
		expect(b.workflow_id).toBe('wf123');
		expect(b.next_upload_at).toBeGreaterThan(Date.now() - 1000);
	});

	it('throws on upload error', async () => {
		vi.mocked(get_user).mockResolvedValue(mockUser(mockToken()) as any);
		vi.mocked(upload_bytes_to_youtube).mockRejectedValue(new Error('yt upload failed'));
		const fd = makeForm({
			video: { name: 'test.mp4', type: 'video/mp4', data: new Uint8Array([1]) },
		});
		const event = mockEvent({ formData: fd });
		const { POST } = await import('./+server');
		await expect(POST(event)).rejects.toThrow('yt upload failed');
	});
});

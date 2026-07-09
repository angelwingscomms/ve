import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/ve', () => ({
	get_ve: vi.fn(),
	delete_ve: vi.fn(),
	add_ve_inst: vi.fn(),
	save_ve: vi.fn(),
	list_ves: vi.fn(),
	update_ve_status: vi.fn(),
	update_ve_video_url: vi.fn(),
	update_ve_yt: vi.fn(),
	increment_ve_retries: vi.fn(),
}));

vi.mock('$lib/server/user', () => ({
	get_user: vi.fn(),
}));

import { get_ve, delete_ve } from '$lib/server/ve';
import type { Ve } from '$lib/types/ve';

const mockVe = (overrides?: Partial<Ve>): Ve => ({
	s: 'e', i: 've123', u: 'user1', p: 'test prompt', m: 'or/model',
	r: 60000, t: 0, d: Date.now(),
	...overrides,
});

function mockEvent(opts?: {
	user?: { id: string; name: string } | null;
	body?: Record<string, unknown>;
	instanceId?: string;
	terminateThrows?: boolean;
}): { event: Parameters<typeof import('./+server').DELETE>[0]; terminateMock: ReturnType<typeof vi.fn> } {
	const terminateMock = opts?.terminateThrows
		? vi.fn().mockRejectedValue(new Error('terminate failed'))
		: vi.fn().mockResolvedValue(undefined);
	const getMock = vi.fn().mockReturnValue({ terminate: terminateMock });

	const user = 'user' in (opts ?? {}) ? opts!.user : { id: 'user1', name: 'Test' };

	return {
		event: {
			locals: { user },
			request: new Request('http://localhost', {
				method: 'DELETE',
				body: JSON.stringify(opts?.body ?? { id: 've123' }),
				headers: { 'content-type': 'application/json' },
			}),
			platform: {
				env: { VIDEO_WORKFLOW: { get: getMock } },
				ctx: {} as any,
				caches: {} as any,
			},
		} as any,
		terminateMock,
	};
}

describe('DELETE /api/ves', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const { event } = mockEvent({ user: null });
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(401);
		const b = await r.json();
		expect(b.error).toBe('unauthorized');
		expect(delete_ve).not.toHaveBeenCalled();
	});

	it('returns 400 when id is missing', async () => {
		const { event } = mockEvent({ body: {} });
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(400);
		expect(delete_ve).not.toHaveBeenCalled();
	});

	it('deletes VE and terminates workflow when instance id exists', async () => {
		vi.mocked(get_ve).mockResolvedValue(mockVe({ n: 've_ve123_1712345678901' }));
		const { event, terminateMock } = mockEvent();
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.ok).toBe(true);

		const env = (event.platform as any).env;
		expect(env.VIDEO_WORKFLOW.get).toHaveBeenCalledWith('ve_ve123_1712345678901');
		expect(terminateMock).toHaveBeenCalledOnce();
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});

	it('deletes VE without terminating when no instance id', async () => {
		vi.mocked(get_ve).mockResolvedValue(mockVe({ n: undefined }));
		const { event } = mockEvent();
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});

	it('handles VE not found (get_ve returns null)', async () => {
		vi.mocked(get_ve).mockResolvedValue(null);
		const { event } = mockEvent();
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});

	it('handles terminate error gracefully and still deletes', async () => {
		vi.mocked(get_ve).mockResolvedValue(mockVe({ n: 've_ve123_1712345678901' }));
		const { event } = mockEvent({ terminateThrows: true });
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});

	it('handles missing VIDEO_WORKFLOW binding gracefully', async () => {
		vi.mocked(get_ve).mockResolvedValue(mockVe({ n: 've_ve123_1712345678901' }));
		const event = {
			locals: { user: { id: 'user1', name: 'Test' } },
			request: new Request('http://localhost', {
				method: 'DELETE',
				body: JSON.stringify({ id: 've123' }),
				headers: { 'content-type': 'application/json' },
			}),
			platform: undefined,
		} as any;
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});

	it('deletes VE when VE exists but belongs to different user (ownership ignored in delete)', async () => {
		vi.mocked(get_ve).mockResolvedValue(mockVe({ u: 'other-user', n: 've_ve123_1712345678901' }));
		const { event, terminateMock } = mockEvent();
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		expect(terminateMock).toHaveBeenCalledOnce();
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});
});

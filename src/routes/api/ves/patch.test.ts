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
	update_ve_pause: vi.fn(),
}));

vi.mock('$lib/server/user', () => ({
	get_user: vi.fn(),
}));

import { get_ve, update_ve_pause, add_ve_inst } from '$lib/server/ve';
import { get_user } from '$lib/server/user';
import type { Ve } from '$lib/types/ve';

const mockVe = (overrides?: Partial<Ve>): Ve => ({
	s: 'e', i: 've123', u: 'user1', p: 'test prompt', m: 'or/model',
	r: 60000, t: 0, d: Date.now(),
	...overrides,
});

function mockEvent(method: 'pause' | 'resume', opts?: {
	user?: { id: string; name: string } | null;
	instanceId?: string;
	terminateThrows?: boolean;
	ve?: Ve | null;
}) {
	const terminateMock = opts?.terminateThrows
		? vi.fn().mockRejectedValue(new Error('terminate failed'))
		: vi.fn().mockResolvedValue(undefined);
	const getMock = vi.fn().mockReturnValue({ terminate: terminateMock });
	const createMock = vi.fn().mockResolvedValue({ id: `inst_${Date.now()}` });

	const user = 'user' in (opts ?? {}) ? opts!.user : { id: 'user1', name: 'Test' };

	const ve = 've' in (opts ?? {}) ? opts!.ve : mockVe();
	vi.mocked(get_ve).mockResolvedValue(ve);

	return {
		event: {
			locals: { user },
			request: new Request('http://localhost', {
				method: 'PATCH',
				body: JSON.stringify({ id: 've123', action: method }),
				headers: { 'content-type': 'application/json' },
			}),
			platform: {
				env: { VIDEO_WORKFLOW: { get: getMock, create: createMock } },
				ctx: {} as any,
				caches: {} as any,
			},
		} as any,
		terminateMock,
		createMock,
	};
}

describe('PATCH /api/ves (pause/resume)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const { event } = mockEvent('pause', { user: null });
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(401);
		const b = await r.json();
		expect(b.error).toBe('unauthorized');
		expect(update_ve_pause).not.toHaveBeenCalled();
	});

	it('returns 400 when id is missing', async () => {
		const event = {
			locals: { user: { id: 'user1', name: 'Test' } },
			request: new Request('http://localhost', {
				method: 'PATCH',
				body: JSON.stringify({ action: 'pause' }),
				headers: { 'content-type': 'application/json' },
			}),
			platform: undefined,
		} as any;
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(400);
	});

	it('returns 400 when action is missing', async () => {
		const event = {
			locals: { user: { id: 'user1', name: 'Test' } },
			request: new Request('http://localhost', {
				method: 'PATCH',
				body: JSON.stringify({ id: 've123' }),
				headers: { 'content-type': 'application/json' },
			}),
			platform: undefined,
		} as any;
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(400);
	});

	it('returns 404 when VE not found', async () => {
		const { event } = mockEvent('pause', { ve: null });
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(404);
		const b = await r.json();
		expect(b.error).toBe('not found');
	});

	it('returns 404 when VE belongs to different user', async () => {
		const { event } = mockEvent('pause', { ve: mockVe({ u: 'other' }) });
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(404);
	});

	it('pause terminates workflow instance and calls update_ve_pause(true)', async () => {
		const ve = mockVe({ n: 've_ve123_1712345678901' });
		vi.mocked(get_ve).mockResolvedValue(ve);
		const { event, terminateMock } = mockEvent('pause', { ve });
		vi.mocked(get_ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve); // second call in PATCH
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);

		const env = (event.platform as any).env;
		expect(env.VIDEO_WORKFLOW.get).toHaveBeenCalledWith('ve_ve123_1712345678901');
		expect(terminateMock).toHaveBeenCalledOnce();
		expect(update_ve_pause).toHaveBeenCalledWith('ve123', true);
	});

	it('pause handles terminate error gracefully', async () => {
		const ve = mockVe({ n: 've_ve123_1712345678901' });
		vi.mocked(get_ve).mockResolvedValue(ve);
		const { event } = mockEvent('pause', { ve, terminateThrows: true });
		vi.mocked(get_ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve);
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);
		expect(update_ve_pause).toHaveBeenCalledWith('ve123', true);
	});

	it('pause works without workflow instance', async () => {
		const ve = mockVe({ n: undefined });
		vi.mocked(get_ve).mockResolvedValue(ve);
		const { event } = mockEvent('pause', { ve });
		vi.mocked(get_ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve);
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);
		expect(update_ve_pause).toHaveBeenCalledWith('ve123', true);
	});

	it('resume calls update_ve_pause(false) and starts new workflow when r>0 and OR key present', async () => {
		const ve = mockVe({ h: 60000, r: 0, c: 'paused' });
		vi.mocked(get_ve).mockResolvedValue(ve);
		vi.mocked(get_user).mockResolvedValue({ a: { o: 'sk-or-v1-xxx' } } as any);
		const { event, createMock } = mockEvent('resume', { ve });
		vi.mocked(get_ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve);
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);
		expect(update_ve_pause).toHaveBeenCalledWith('ve123', false);
		const env = (event.platform as any).env;
		expect(env.VIDEO_WORKFLOW.create).toHaveBeenCalled();
		expect(add_ve_inst).toHaveBeenCalled();
	});

	it('resume does not start workflow when OR key missing', async () => {
		const ve = mockVe({ h: 60000, r: 0, c: 'paused' });
		vi.mocked(get_ve).mockResolvedValue(ve);
		vi.mocked(get_user).mockResolvedValue({ a: {} } as any);
		const { event } = mockEvent('resume', { ve });
		vi.mocked(get_ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve).mockResolvedValueOnce(ve);
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);
		const env = (event.platform as any).env;
		expect(env.VIDEO_WORKFLOW.create).not.toHaveBeenCalled();
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/ve', () => ({
	get_ve: vi.fn(),
	delete_ve: vi.fn(),
	save_ve: vi.fn(),
	list_ves: vi.fn(),
	update_ve_pause: vi.fn()
}));

import { get_ve, update_ve_pause } from '$lib/server/ve';
import type { Ve } from '$lib/types/ve';

const mockVe = (overrides?: Partial<Ve>): Ve => ({
	s: 'e',
	i: 've123',
	u: 'user1',
	p: 'test prompt',
	m: 'or/model',
	r: 60000,
	t: 0,
	d: Date.now(),
	...overrides
});

function mockEvent(method: 'pause' | 'resume', opts?: { user?: { id: string; name: string } | null; ve?: Ve | null }) {
	const user = 'user' in (opts ?? {}) ? opts!.user : { id: 'user1', name: 'Test' };
	const ve = 've' in (opts ?? {}) ? opts!.ve : mockVe();
	vi.mocked(get_ve).mockResolvedValue(ve);
	return {
		event: {
			locals: { user },
			request: new Request('http://localhost', {
				method: 'PATCH',
				body: JSON.stringify({ id: 've123', action: method }),
				headers: { 'content-type': 'application/json' }
			})
		} as any
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
		expect(update_ve_pause).not.toHaveBeenCalled();
	});

	it('returns 404 when VE not found', async () => {
		const { event } = mockEvent('pause', { ve: null });
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(404);
	});

	it('pause only flips the row', async () => {
		const { event } = mockEvent('pause');
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);
		expect(update_ve_pause).toHaveBeenCalledWith('ve123', true);
	});

	it('resume only flips the row', async () => {
		const { event } = mockEvent('resume', { ve: mockVe({ h: 60000, r: 0, c: 'paused' }) });
		const { PATCH } = await import('./+server');
		const r = await PATCH(event);
		expect(r.status).toBe(200);
		expect(update_ve_pause).toHaveBeenCalledWith('ve123', false);
	});
});

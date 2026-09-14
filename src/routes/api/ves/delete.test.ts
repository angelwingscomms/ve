import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/ve', () => ({
	get_ve: vi.fn(),
	delete_ve: vi.fn(),
	save_ve: vi.fn(),
	list_ves: vi.fn(),
	update_ve_pause: vi.fn()
}));

import { delete_ve } from '$lib/server/ve';

function mockEvent(opts?: { user?: { id: string; name: string } | null; body?: Record<string, unknown> }) {
	const user = 'user' in (opts ?? {}) ? opts!.user : { id: 'user1', name: 'Test' };
	return {
		event: {
			locals: { user },
			request: new Request('http://localhost', {
				method: 'DELETE',
				body: JSON.stringify(opts?.body ?? { id: 've123' }),
				headers: { 'content-type': 'application/json' }
			})
		} as any
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
		expect(delete_ve).not.toHaveBeenCalled();
	});

	it('returns 400 when id is missing', async () => {
		const { event } = mockEvent({ body: {} });
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(400);
		expect(delete_ve).not.toHaveBeenCalled();
	});

	it('deletes the ve', async () => {
		const { event } = mockEvent();
		const { DELETE } = await import('./+server');
		const r = await DELETE(event);
		expect(r.status).toBe(200);
		expect(delete_ve).toHaveBeenCalledWith('ve123');
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	INTERNAL_KEY: 'test-internal-key',
}));

vi.mock('$lib/server/ve', () => ({
	add_ve_inst: vi.fn(),
}));

import { add_ve_inst } from '$lib/server/ve';

function mockEvent(opts?: {
	validKey?: boolean;
	body?: Record<string, unknown>;
}): { event: Parameters<typeof import('./+server').POST>[0] } {
	const body = opts?.body ?? { i: 've123', n: 've_ve123_1712345678901' };
	return {
		event: {
			request: new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify(body),
				headers: {
					'content-type': 'application/json',
					'x-internal-key': opts?.validKey !== false ? 'test-internal-key' : 'bad-key',
				},
			}),
		} as any,
	};
}

describe('POST /api/internal/ve/inst', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when internal key is missing', async () => {
		const { event } = mockEvent({ validKey: false });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(401);
		expect(add_ve_inst).not.toHaveBeenCalled();
	});

	it('returns 400 when i is missing', async () => {
		const { event } = mockEvent({ body: { n: 'inst1' } });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(400);
		expect(add_ve_inst).not.toHaveBeenCalled();
	});

	it('returns 400 when n is missing', async () => {
		const { event } = mockEvent({ body: { i: 've123' } });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(400);
		expect(add_ve_inst).not.toHaveBeenCalled();
	});

	it('stores instance id on VE', async () => {
		vi.mocked(add_ve_inst).mockResolvedValue(undefined);
		const { event } = mockEvent();
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.ok).toBe(true);
		expect(add_ve_inst).toHaveBeenCalledWith('ve123', 've_ve123_1712345678901');
	});

	it('handles add_ve_inst error gracefully', async () => {
		vi.mocked(add_ve_inst).mockRejectedValue(new Error('db error'));
		const { event } = mockEvent();
		const { POST } = await import('./+server');
		await expect(POST(event)).rejects.toThrow('db error');
	});
});
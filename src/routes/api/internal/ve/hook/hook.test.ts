import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	INTERNAL_KEY: 'test-internal-key'
}));

vi.mock('$lib/server/ve', () => ({
	get_ve_by_job: vi.fn(),
	update_ve_status: vi.fn(),
	update_ve_video_url: vi.fn()
}));

import { get_ve_by_job, update_ve_status, update_ve_video_url } from '$lib/server/ve';

function mockEvent(opts?: { body?: unknown; validKey?: boolean }) {
	return {
		event: {
			request: new Request('http://localhost/api/internal/ve/hook', {
				method: 'POST',
				body: JSON.stringify(
					opts?.body ?? {
						type: 'video.generation.completed',
						data: { id: 'job-1', status: 'completed', unsigned_urls: ['https://x'] }
					}
				),
				headers: {
					'content-type': 'application/json',
					'x-internal-key': opts?.validKey !== false ? 'test-internal-key' : 'bad'
				}
			}),
			url: new URL('http://localhost/api/internal/ve/hook')
		} as any
	};
}

describe('POST /api/internal/ve/hook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when the key is wrong', async () => {
		const { event } = mockEvent({ validKey: false });
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(401);
	});

	it('saves the video url when the job completed', async () => {
		vi.mocked(get_ve_by_job).mockResolvedValue({ i: 've1', j: 'job-1' } as any);
		const { event } = mockEvent();
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(204);
		expect(update_ve_video_url).toHaveBeenCalledWith('ve1', 'https://x');
		expect(update_ve_status).not.toHaveBeenCalled();
	});
});

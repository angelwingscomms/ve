import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	INTERNAL_KEY: 'test-internal-key'
}));

vi.mock('$lib/server/ve', () => ({
	get_ve_by_job: vi.fn()
}));

import { get_ve_by_job } from '$lib/server/ve';

function mockEvent(opts?: {
	body?: unknown;
	validKey?: boolean;
	sendEvent?: ReturnType<typeof vi.fn>;
}) {
	const sendEvent = opts?.sendEvent ?? vi.fn().mockResolvedValue(undefined);
	return {
		sendEvent,
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
			platform: {
				env: { VIDEO_WORKFLOW: { get: vi.fn().mockReturnValue({ sendEvent }) } }
			}
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

	it('forwards a completed job to the waiting workflow', async () => {
		vi.mocked(get_ve_by_job).mockResolvedValue({ i: 've1', j: 'job-1', n: 'inst-1' } as any);
		const { event, sendEvent } = mockEvent();
		const { POST } = await import('./+server');
		const r = await POST(event);
		expect(r.status).toBe(204);
		expect(sendEvent).toHaveBeenCalledWith({
			type: 'or',
			payload: {
				type: 'video.generation.completed',
				data: { id: 'job-1', status: 'completed', unsigned_urls: ['https://x'] }
			}
		});
	});
});

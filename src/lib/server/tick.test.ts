import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./ve', () => ({
	list_ves: vi.fn(),
	update_ve_job: vi.fn(),
	update_ve_status: vi.fn(),
	update_ve_video_url: vi.fn(),
	update_ve_yt: vi.fn()
}));

vi.mock('./user', () => ({
	get_user: vi.fn()
}));

vi.mock('./yt', () => ({
	upload_to_youtube: vi.fn(),
	upload_bytes_to_youtube: vi.fn()
}));

import { list_ves, update_ve_job, update_ve_status, update_ve_video_url, update_ve_yt } from './ve';
import { get_user } from './user';
import { upload_to_youtube, upload_bytes_to_youtube } from './yt';
import { run_tick } from './tick';
import type { Ve } from '$lib/types/ve';

function ve(overrides?: Partial<Ve>): Ve {
	return {
		s: 'e',
		i: 'a',
		u: 'u',
		p: 'p',
		m: 'm',
		r: 86_400_000,
		t: 0,
		d: 0,
		...overrides
	};
}

describe('run_tick', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		vi.mocked(get_user).mockResolvedValue({ a: { o: 'or-key', y: JSON.stringify({ refresh_token: 'rt' }) } } as any);
	});

	it('submits due ves, polls open jobs, uploads ready youtube', async () => {
		vi.mocked(list_ves).mockResolvedValue([
			ve({ i: 'due-new' }),
			ve({ i: 'fresh', l: 9_000 }),
			ve({ i: 'paused', r: 0 }),
			ve({ i: 'cooking', c: 'sampling', j: 'job-1' }),
			ve({ i: 'ready', y: 1, w: 'https://v.mp4', ys: undefined, l: 9_000 })
		]);
		const fetch_mock = vi.fn(async (url: string, init?: RequestInit) => {
			if (url === 'https://openrouter.ai/api/v1/videos' && init?.method === 'POST') {
				return new Response(JSON.stringify({ id: 'job-new' }), { status: 202 });
			}
			if (url === 'https://openrouter.ai/api/v1/videos/job-1') {
				return new Response(
					JSON.stringify({ status: 'completed', unsigned_urls: ['https://done.mp4'] }),
					{ status: 200 }
				);
			}
			return new Response('no', { status: 404 });
		});
		vi.stubGlobal('fetch', fetch_mock);
		vi.mocked(upload_to_youtube).mockResolvedValue('yt1');

		const n = await run_tick({ ORIGIN: 'https://ve.example' }, 10_000);
		expect(n).toEqual({ submitted: 1, polled: 1, uploaded: 1 });
		expect(update_ve_job).toHaveBeenCalledWith('due-new', 'job-new');
		expect(update_ve_video_url).toHaveBeenCalledWith('cooking', 'https://done.mp4');
		expect(upload_to_youtube).toHaveBeenCalledOnce();
		expect(update_ve_yt).toHaveBeenCalledWith('ready', 'live', 'yt1');
	});

	it('uploads a due test ve from r2', async () => {
		vi.mocked(list_ves).mockResolvedValue([
			ve({ i: 'test1', x: 1, j: 'test/u/k', r: 100, l: undefined })
		]);
		const get = vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) });
		vi.mocked(upload_bytes_to_youtube).mockResolvedValue('yt-test');
		const n = await run_tick({ TEST_BUCKET: { get } }, 10_000);
		expect(n).toEqual({ submitted: 0, polled: 0, uploaded: 1 });
		expect(get).toHaveBeenCalledWith('test/u/k');
		expect(update_ve_video_url).toHaveBeenCalledWith('test1', '');
	});
});

import { describe, expect, it, vi } from 'vitest';

describe('get_video_models', () => {
	it('fetches models from OpenRouter', async () => {
		const expected = { data: [{ id: 'or/video-model', name: 'Test Model' }] };
		const mock = vi.fn().mockResolvedValue({ ok: true, json: () => expected });
		vi.stubGlobal('fetch', mock);

		const { get_video_models } = await import('./openrouter');
		const models = await get_video_models('test-key');
		expect(models).toHaveLength(1);
		expect(models[0].id).toBe('or/video-model');
		expect(mock).toHaveBeenCalledWith('https://openrouter.ai/api/v1/videos/models', {
			headers: { Authorization: 'Bearer test-key' }
		});
		vi.unstubAllGlobals();
	});

	it('throws on error response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
		const { get_video_models } = await import('./openrouter');
		await expect(get_video_models('bad-key')).rejects.toThrow('OpenRouter API error: 401');
		vi.unstubAllGlobals();
	});
});

export interface VideoModel {
	id: string;
	name: string;
	description?: string;
	pricing_skus?: Record<string, string>;
	supported_resolutions?: string[];
}

const cache = new Map<string, { models: VideoModel[]; ts: number }>();

export async function get_video_models(api_key: string): Promise<VideoModel[]> {
	const cached = cache.get(api_key);
	if (cached && Date.now() - cached.ts < 300000) return cached.models;

	const r = await fetch('https://openrouter.ai/api/v1/videos/models', {
		headers: { Authorization: `Bearer ${api_key}` }
	});
	if (!r.ok) throw new Error(`OpenRouter API error: ${r.status}`);
	const data = (await r.json()) as { data: VideoModel[] };
	cache.set(api_key, { models: data.data, ts: Date.now() });
	return data.data;
}

import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';

export const C = 'i';
let q: QdrantClient | null = null;
let size: number | null = null;

export function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function parse_size(v: unknown): number {
	if (!v || typeof v !== 'object') return 0;
	if (typeof (v as { size?: number }).size === 'number') return (v as { size: number }).size;
	const named = v as Record<string, { size?: number }>;
	for (const k of Object.keys(named)) {
		if (typeof named[k]?.size === 'number') return named[k].size as number;
	}
	return 0;
}

async function vec_size(): Promise<number> {
	if (size === null) {
		const r = await fetch(`${QDRANT_URL}/collections/${C}`, { headers: { 'api-key': QDRANT_KEY } });
		const j = (await r.json()) as { result?: { config?: { params?: { vectors?: unknown } } } };
		size = parse_size(j?.result?.config?.params?.vectors);
	}
	return size;
}

export async function upsert(id: string, payload: Record<string, unknown>): Promise<void> {
	const s = await vec_size();
	const vector = s > 0 ? new Array(s).fill(0) : null;
	await client().upsert(C, { points: [{ id, vector, payload }] } as any);
}

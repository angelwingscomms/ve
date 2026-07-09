import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';

export const C = 'i';
let q: QdrantClient | null = null;
let size: number | null = null;

export function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

async function vec_size(): Promise<number> {
	if (size === null) {
		const r = await client().getCollection(C);
		const v = (r.config.params.vectors as { size?: number }) ?? {};
		size = v.size ?? 0;
	}
	return size;
}

export async function upsert(id: string, payload: Record<string, unknown>): Promise<void> {
	const s = await vec_size();
	const vector = s > 0 ? new Array(s).fill(0) : null;
	await client().upsert(C, { points: [{ id, vector, payload }] } as any);
}

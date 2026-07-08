import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import type { Ve } from '$lib/types/ve';

const C = 'i';
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function from_payload(p: Record<string, unknown>): Ve | null {
	if (p?.s !== 'e') return null;
	return { s: 'e', i: p.i as string, u: p.u as string, p: p.p as string, m: p.m as string, g: p.g as number | undefined, z: p.z as string | undefined, r: p.r as number, t: p.t as number, c: p.c as string | undefined, l: p.l as number | undefined, d: p.d as number };
}

export async function save_ve(id: string, u: string, prompt: string, model: string, period: number, duration?: number, resolution?: string): Promise<void> {
	const v: Ve = { s: 'e', i: id, u, p: prompt, m: model, g: duration, z: resolution, r: period, t: 0, d: Date.now() };
	await client().upsert(C, { points: [{ id, vector: {}, payload: v as unknown as Record<string, unknown> }] } as any);
}

export async function get_ve(id: string): Promise<Ve | null> {
	const r = await client().retrieve(C, { ids: [id] });
	return from_payload(r[0]?.payload as Record<string, unknown>);
}

export async function list_ves(user_id?: string): Promise<Ve[]> {
	const f: Record<string, unknown> = { must: [{ key: 's', match: { value: 'e' } }] };
	if (user_id) (f.must as Record<string, unknown>[]).push({ key: 'u', match: { value: user_id } });
	const r = await client().scroll(C, { filter: f, limit: 100 } as any);
	return r.points.map(p => from_payload(p.payload as Record<string, unknown>)).filter(Boolean) as Ve[];
}

export async function delete_ve(id: string): Promise<void> {
	await client().delete(C, { points: [id] });
}

export async function update_ve_status(id: string, c: string): Promise<void> {
	const v = await get_ve(id);
	if (!v) return;
	v.c = c;
	if (c === 'done') v.l = Date.now();
	await client().upsert(C, { points: [{ id, vector: {}, payload: v as unknown as Record<string, unknown> }] } as any);
}

export async function increment_ve_retries(id: string): Promise<void> {
	const v = await get_ve(id);
	if (!v) return;
	v.t = (v.t || 0) + 1;
	await client().upsert(C, { points: [{ id, vector: {}, payload: v as unknown as Record<string, unknown> }] } as any);
}

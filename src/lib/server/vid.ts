import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import type { Vid } from '$lib/types/vid';

const C = 'i';
let q: QdrantClient | null = null;
const local = new Map<string, Vid>();

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function pid(id: string): string {
	return 'v_' + id;
}

function from_payload(p: Record<string, unknown>): Vid | null {
	if (p?.s !== 'v') return null;
	return {
		s: 'v',
		i: p.i as string,
		u: p.u as string,
		p: p.p as string,
		m: p.m as string,
		r: p.r as number,
		t: p.t as number,
		c: p.c as string | undefined,
		l: p.l as number | undefined,
		d: p.d as number
	};
}

export async function save_vid(
	id: string,
	u: string,
	prompt: string,
	model: string,
	period: number
): Promise<void> {
	const v: Vid = { s: 'v', i: id, u, p: prompt, m: model, r: period, t: 0, d: Date.now() };
	try {
		await client().upsert(C, {
			points: [{ id: pid(id), vector: {}, payload: v as unknown as Record<string, unknown> }]
		} as any);
	} catch {
		local.set(pid(id), v);
	}
}

export async function get_vid(id: string): Promise<Vid | null> {
	try {
		const r = await client().retrieve(C, { ids: [pid(id)] });
		return from_payload(r[0]?.payload as Record<string, unknown>);
	} catch {
		return local.get(pid(id)) || null;
	}
}

export async function list_vids(user_id?: string): Promise<Vid[]> {
	try {
		const f: Record<string, unknown> = { must: [{ key: 's', match: { value: 'v' } }] };
		if (user_id)
			(f.must as Record<string, unknown>[]).push({ key: 'u', match: { value: user_id } });
		const r = await client().scroll(C, { filter: f, limit: 100 } as any);
		return r.points
			.map((p) => from_payload(p.payload as Record<string, unknown>))
			.filter(Boolean) as Vid[];
	} catch {
		return Array.from(local.values()).filter((v) => !user_id || v.u === user_id);
	}
}

export async function delete_vid(id: string): Promise<void> {
	try {
		await client().delete(C, { points: [pid(id)] });
	} catch {}
	local.delete(pid(id));
}

export async function update_vid_status(id: string, c: string): Promise<void> {
	const v = await get_vid(id);
	if (!v) return;
	v.c = c;
	if (c === 'done') v.l = Date.now();
	try {
		await client().upsert(C, {
			points: [{ id: pid(id), vector: {}, payload: v as unknown as Record<string, unknown> }]
		} as any);
	} catch {
		local.set(pid(id), v);
	}
}

export async function increment_vid_retries(id: string): Promise<void> {
	const v = await get_vid(id);
	if (!v) return;
	v.t = (v.t || 0) + 1;
	try {
		await client().upsert(C, {
			points: [{ id: pid(id), vector: {}, payload: v as unknown as Record<string, unknown> }]
		} as any);
	} catch {
		local.set(pid(id), v);
	}
}

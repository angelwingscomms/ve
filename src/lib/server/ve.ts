import { client, upsert } from './qdrant';
import type { Ve } from '$lib/types/ve';

const C = 'i';

function from_payload(p: Record<string, unknown>): Ve | null {
	if (p?.s !== 'e') return null;
	return { s: 'e', i: p.i as string, u: p.u as string, p: p.p as string, m: p.m as string, g: p.g as number | undefined, z: p.z as string | undefined, ar: p.ar as string | undefined, r: p.r as number, t: p.t as number, x: p.x as number | undefined, c: p.c as string | undefined, l: p.l as number | undefined, j: p.j as string | undefined, k: p.k as string | undefined, w: p.w as string | undefined, n: p.n as string | undefined, h: p.h as number | undefined, y: p.y as number | undefined, ys: p.ys as string | undefined, yv: p.yv as string | undefined, d: p.d as number };
}

export async function save_ve(id: string, u: string, prompt: string, model: string, period: number, duration?: number, resolution?: string, job_id?: string, yt?: number, test?: number, kind?: string, aspect?: string): Promise<void> {
	const v: Ve = { s: 'e', i: id, u, p: prompt, m: model, g: duration, z: resolution, ar: aspect, r: period, t: 0, x: test, c: job_id ? 'sampling' : undefined, j: job_id, k: kind, y: yt, d: Date.now() };
	await upsert(id, v as unknown as Record<string, unknown>);
}

export async function update_ve_video_url(id: string, w: string): Promise<void> {
	await client().setPayload(C, { payload: { w, c: 'done', l: Date.now() }, points: [id], wait: true });
}

export async function update_ve_yt(id: string, ys: string, yv?: string): Promise<void> {
	const p: Record<string, unknown> = { ys };
	if (yv) p.yv = yv;
	await client().setPayload(C, { payload: p, points: [id], wait: true });
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

export async function list_test_ves(user_id: string): Promise<Ve[]> {
	const r = await client().scroll(C, { filter: { must: [{ key: 's', match: { value: 'e' } }, { key: 'u', match: { value: user_id } }] }, limit: 100 } as any);
	return r.points.map(p => from_payload(p.payload as Record<string, unknown>)).filter(Boolean).filter(v => v.x === 1) as Ve[];
}

export async function add_ve_inst(id: string, n: string): Promise<void> {
	await client().setPayload(C, { payload: { n }, points: [id], wait: true });
}

export async function delete_ve(id: string): Promise<void> {
	await client().delete(C, { points: [id] });
}

export async function update_ve_status(id: string, c: string): Promise<void> {
	const p: Record<string, unknown> = { c };
	if (c === 'done') p.l = Date.now();
	await client().setPayload(C, { payload: p, points: [id], wait: true });
}

export async function increment_ve_retries(id: string): Promise<void> {
	const v = await get_ve(id);
	if (!v) return;
	v.t = (v.t || 0) + 1;
	await upsert(id, v as unknown as Record<string, unknown>);
}

export async function update_ve_pause(id: string, pause: boolean): Promise<void> {
	const v = await get_ve(id);
	if (!v) return;
	if (pause) {
		v.h = v.r;
		v.r = 0;
		v.c = 'paused';
	} else {
		if (!v.h) return;
		v.r = v.h;
		v.h = undefined;
		v.c = 'active';
	}
	await upsert(id, v as unknown as Record<string, unknown>);
}

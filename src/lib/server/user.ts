import { client, upsert } from './qdrant';
import type { User } from '$lib/types/user';

const C = 'i';

export async function save_user(
	_event: unknown,
	id: string,
	name: string,
	picture?: string,
	email?: string
): Promise<void> {
	const r = await client().scroll(C, {
		filter: { must: [{ key: 's', match: { value: 'u' } }, { key: 'g', match: { value: id } }] },
		limit: 1
	} as any);
	if (r.points.length) {
		const cur = r.points[0].payload as Record<string, unknown>;
		cur.d = Date.now();
		await upsert(r.points[0].id as string, cur as unknown as Record<string, unknown>);
		return;
	}
	await upsert(crypto.randomUUID(), { s: 'u', g: id, n: name, p: picture, m: email, d: Date.now() } as unknown as Record<string, unknown>);
}

export async function get_user(_event: unknown, id: string): Promise<User | null> {
	const r = await client().scroll(C, {
		filter: { must: [{ key: 's', match: { value: 'u' } }, { key: 'g', match: { value: id } }] },
		limit: 1
	} as any);
	if (!r.points.length) return null;
	const u = r.points[0].payload as Record<string, unknown>;
	return { s: 'u', n: u.n as string, p: u.p as string | undefined, m: u.m as string | undefined, a: u.a as User['a'] | undefined, d: u.d as number };
}

export async function update_user_api_keys(
	_event: unknown,
	id: string,
	api_keys: User['a']
): Promise<void> {
	const r = await client().scroll(C, {
		filter: { must: [{ key: 's', match: { value: 'u' } }, { key: 'g', match: { value: id } }] },
		limit: 1
	} as any);
	if (!r.points.length) throw new Error('user not found');
	await upsert(r.points[0].id as string, { ...r.points[0].payload as Record<string, unknown>, a: api_keys } as unknown as Record<string, unknown>);
}

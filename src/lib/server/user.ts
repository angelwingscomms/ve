import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_KEY, QDRANT_URL } from '$env/static/private';
import type { User } from '$lib/types/user';

const C = 'i';
const local = new Map<string, User>();
let q: QdrantClient | null = null;

function client(): QdrantClient {
	if (!q) q = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY, checkCompatibility: false });
	return q;
}

function pid(id: string): string {
	return 'u_' + id;
}

export async function save_user(
	_event: unknown,
	id: string,
	name: string,
	picture?: string,
	email?: string
): Promise<void> {
	const u: User = { s: 'u', n: name, p: picture, m: email, d: Date.now() };
	try {
		const r = await client().retrieve(C, { ids: [pid(id)] });
		const cur = r[0]?.payload as Record<string, unknown> | undefined;
		if (cur?.s === 'u') {
			u.d = (cur.d as number) || u.d;
			if (cur.a) u.a = cur.a as User['a'];
		}
		await client().upsert(C, {
			points: [{ id: pid(id), vector: {}, payload: u as unknown as Record<string, unknown> }]
		} as any);
	} catch {
		local.set(pid(id), u);
	}
}

export async function get_user(_event: unknown, id: string): Promise<User | null> {
	try {
		const r = await client().retrieve(C, { ids: [pid(id)] });
		const u = r[0]?.payload as Record<string, unknown> | undefined;
		if (u?.s === 'u') {
			return {
				s: 'u',
				n: u.n as string,
				p: u.p as string | undefined,
				m: u.m as string | undefined,
				a: u.a as User['a'] | undefined,
				d: u.d as number
			};
		}
		return null;
	} catch {
		return local.get(pid(id)) || null;
	}
}

export async function update_user_api_keys(
	_event: unknown,
	id: string,
	api_keys: User['a']
): Promise<void> {
	try {
		const r = await client().retrieve(C, { ids: [pid(id)] });
		const cur = r[0]?.payload as Record<string, unknown> | undefined;
		if (cur?.s !== 'u') return;
		await client().upsert(C, {
			points: [
				{
					id: pid(id),
					vector: {},
					payload: { ...cur, a: api_keys } as unknown as Record<string, unknown>
				}
			]
		} as any);
	} catch {}
}

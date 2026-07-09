import { describe, it, expect } from 'vitest';

const BASE = process.env.E2E_BASE_URL;
const COOKIE = process.env.E2E_COOKIE;
const skip = !BASE || !COOKIE;

describe.skipIf(skip)('PATCH /api/ves (pause/resume) e2e', () => {
	const id = `e2e-pause-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

	it('full pause/resume cycle', async () => {
		let r: Response, body: Record<string, any>;

		try {
			r = await fetch(`${BASE}/api/ves`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', cookie: `__session=${COOKIE}` },
				body: JSON.stringify({ id, p: 'e2e test', m: 'or/test-model', r: 60000 }),
			});
			expect(r.status).toBe(200);
			body = await r.json();
			expect(body.ve.n).toBeTruthy();
			expect(body.ve.r).toBe(60000);

			r = await fetch(`${BASE}/api/ves`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json', cookie: `__session=${COOKIE}` },
				body: JSON.stringify({ id, action: 'pause' }),
			});
			expect(r.status).toBe(200);
			body = await r.json();
			expect(body.ve.r).toBe(0);
			expect(body.ve.h).toBe(60000);
			expect(body.ve.c).toBe('paused');

			r = await fetch(`${BASE}/api/ves?id=${id}`, {
				headers: { cookie: `__session=${COOKIE}` },
			});
			expect(r.status).toBe(200);
			body = await r.json();
			expect(body.ve.r).toBe(0);
			expect(body.ve.h).toBe(60000);
			expect(body.ve.c).toBe('paused');

			r = await fetch(`${BASE}/api/ves`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json', cookie: `__session=${COOKIE}` },
				body: JSON.stringify({ id, action: 'resume' }),
			});
			expect(r.status).toBe(200);
			body = await r.json();
			expect(body.ve.r).toBe(60000);
			expect(body.ve.h).toBeUndefined();
			expect(body.ve.c).toBe('active');
			expect(body.ve.n).toBeTruthy();
			const n2 = body.ve.n;

			r = await fetch(`${BASE}/api/ves?id=${id}`, {
				headers: { cookie: `__session=${COOKIE}` },
			});
			expect(r.status).toBe(200);
			body = await r.json();
			expect(body.ve.r).toBe(60000);
			expect(body.ve.n).toBe(n2);
		} finally {
			await fetch(`${BASE}/api/ves`, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json', cookie: `__session=${COOKIE}` },
				body: JSON.stringify({ id }),
			});
		}
	}, 30_000);
});

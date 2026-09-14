import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./ve', () => ({
	list_ves: vi.fn(),
	add_ve_inst: vi.fn()
}));

import { list_ves, add_ve_inst } from './ve';
import { run_tick } from './tick';
import type { Ve } from '$lib/types/ve';

function ve(overrides?: Partial<Ve>): Ve {
	return {
		s: 'e',
		i: 'a',
		u: 'u',
		p: 'p',
		m: 'm',
		r: 86_400_000,
		t: 0,
		d: 0,
		...overrides
	};
}

describe('run_tick', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('starts a one-shot job for each due ve and skips the rest', async () => {
		vi.mocked(list_ves).mockResolvedValue([
			ve({ i: 'due-new' }),
			ve({ i: 'due-old', l: 1, r: 100 }),
			ve({ i: 'fresh', l: 9_000, r: 86_400_000 }),
			ve({ i: 'paused', r: 0, h: 86_400_000 }),
			ve({ i: 'busy', c: 'sampling' })
		]);
		const create = vi.fn().mockImplementation(async ({ params }: { params: { ve_id: string } }) => ({
			id: `inst_${params.ve_id}`
		}));
		const n = await run_tick({ VIDEO_WORKFLOW: { create } }, 10_000);
		expect(n).toBe(2);
		expect(create).toHaveBeenCalledTimes(2);
		expect(create.mock.calls.map((c) => c[0].params.ve_id).sort()).toEqual(['due-new', 'due-old']);
		expect(add_ve_inst).toHaveBeenCalledTimes(2);
	});

	it('returns 0 when the workflow binding is missing', async () => {
		vi.mocked(list_ves).mockResolvedValue([ve()]);
		expect(await run_tick({}, 1)).toBe(0);
	});
});

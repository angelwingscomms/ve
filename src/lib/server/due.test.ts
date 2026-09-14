import { describe, expect, it } from 'vitest';
import { is_due } from './due';
import type { Ve } from '$lib/types/ve';

function ve(overrides?: Partial<Ve>): Ve {
	return {
		s: 'e',
		i: '1',
		u: 'u',
		p: 'p',
		m: 'm',
		r: 86_400_000,
		t: 0,
		d: 0,
		...overrides
	};
}

describe('is_due', () => {
	it('is false when period is 0', () => {
		expect(is_due(ve({ r: 0 }), 1_000)).toBe(false);
	});

	it('is true when never run', () => {
		expect(is_due(ve({ l: undefined }), 1_000)).toBe(true);
	});

	it('is false when last run is still inside the period', () => {
		expect(is_due(ve({ l: 1_000, r: 86_400_000 }), 1_000 + 86_399_999)).toBe(false);
	});

	it('is true when last run is at or past the period', () => {
		expect(is_due(ve({ l: 1_000, r: 86_400_000 }), 1_000 + 86_400_000)).toBe(true);
	});

	it('is false while a run is already in flight', () => {
		expect(is_due(ve({ c: 'sampling' }), 1_000)).toBe(false);
	});

	it('is true for a due test ve even if marked sampling', () => {
		expect(is_due(ve({ c: 'sampling', x: 1 }), 1_000)).toBe(true);
	});

	it('is true for an enabled ve that has never run', () => {
		expect(is_due(ve({ c: 'active' }), 1_000)).toBe(true);
	});
});

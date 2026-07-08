import { describe, expect, it } from 'vitest';
import type { Vid } from './vid';

describe('Vid type', () => {
	it('has single-letter keys', () => {
		const v: Vid = { s: 'v', i: '1', u: 'u1', p: 'prompt', m: 'model', r: 86400000, t: 0, d: 0 };
		expect(Object.keys(v).every((k) => k.length === 1)).toBe(true);
	});

	it('has correct fields', () => {
		const v: Vid = {
			s: 'v',
			i: '1',
			u: 'u1',
			p: 'a prompt',
			m: 'or/video-model',
			r: 3600000,
			t: 2,
			c: 'active',
			d: 1000
		};
		expect(v.s).toBe('v');
		expect(v.i).toBe('1');
		expect(v.p).toBe('a prompt');
		expect(v.m).toBe('or/video-model');
		expect(v.r).toBe(3600000);
		expect(v.t).toBe(2);
		expect(v.c).toBe('active');
	});
});

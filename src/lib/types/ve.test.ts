import { describe, expect, it } from 'vitest';
import type { Ve } from './ve';

describe('Ve type', () => {
	it('has single-letter keys', () => {
		const v: Ve = { s: 'e', i: '1', u: 'u1', p: 'prompt', m: 'model', r: 86400000, t: 0, d: 0 };
		expect(Object.keys(v).filter(k => k !== 'j' && k !== 'w' && k !== 'n').every((k) => k.length === 1)).toBe(true);
	});

	it('has correct fields', () => {
		const v: Ve = {
			s: 'e',
			i: '1',
			u: 'u1',
			p: 'a prompt',
			m: 'or/video-model',
			r: 3600000,
			g: 30,
			t: 2,
			c: 'active',
			d: 1000
		};
		expect(v.s).toBe('e');
		expect(v.i).toBe('1');
		expect(v.p).toBe('a prompt');
		expect(v.m).toBe('or/video-model');
		expect(v.g).toBe(30);
		expect(v.r).toBe(3600000);
		expect(v.t).toBe(2);
		expect(v.c).toBe('active');
	});

	it('supports optional workflow instance id n', () => {
		const v: Ve = {
			s: 'e', i: 'v1', u: 'u1', p: 'test', m: 'or/model',
			r: 60000, t: 0, d: 0,
			n: 've_v1_1712345678901'
		};
		expect(v.n).toBe('ve_v1_1712345678901');
		const v2: Ve = { s: 'e', i: 'v2', u: 'u1', p: 'test', m: 'or/model', r: 60000, t: 0, d: 0 };
		expect(v2.n).toBeUndefined();
	});

	it('supports sample fields j and w', () => {
		const v: Ve = {
			s: 'e', i: 's1', u: 'u1', p: 'test', m: 'or/model',
			r: 0, t: 0, d: 0, c: 'sampling', j: 'or-job-123'
		};
		expect(v.j).toBe('or-job-123');
		expect(v.c).toBe('sampling');

		v.w = 'https://example.com/video.mp4';
		v.c = 'done';
		expect(v.w).toContain('video.mp4');
		expect(v.c).toBe('done');
	});
});

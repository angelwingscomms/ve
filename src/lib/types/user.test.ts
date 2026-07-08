import { describe, expect, it } from 'vitest';
import type { User } from './user';

describe('User type', () => {
	it('has single-letter keys', () => {
		const u: User = { s: 'u', n: 'test', d: 0 };
		expect(Object.keys(u).every((k) => k.length === 1)).toBe(true);
	});

	it('api keys have single-letter keys', () => {
		const a: User['a'] = { o: 'key-o', i: 'key-i', x: 'key-x', y: 'key-y', t: 'key-t' };
		expect(Object.keys(a).every((k) => k.length === 1)).toBe(true);
		expect(a.o).toBe('key-o');
		expect(a.i).toBe('key-i');
		expect(a.x).toBe('key-x');
		expect(a.y).toBe('key-y');
		expect(a.t).toBe('key-t');
	});
});

import { describe, expect, it } from 'vitest';

describe('session', () => {
	it('exports encode_session and decode_session', async () => {
		const mod = await import('./session');
		expect(typeof mod.encode_session).toBe('function');
		expect(typeof mod.decode_session).toBe('function');
	});

	it('round-trips encode and decode', async () => {
		const mod = await import('./session');
		const data = {
			id: 'test123',
			name: 'Test User',
			picture: 'https://example.com/pic.jpg',
			email: 'test@example.com'
		};
		const token = await mod.encode_session(data);
		expect(typeof token).toBe('string');
		expect(token.includes('.')).toBe(true);
		const result = await mod.decode_session(token);
		expect(result).not.toBeNull();
		expect(result!.user.id).toBe('test123');
		expect(result!.user.name).toBe('Test User');
	});

	it('returns null for invalid token', async () => {
		const mod = await import('./session');
		const result = await mod.decode_session('invalid.token.here');
		expect(result).toBeNull();
	});

	it('returns null for null input', async () => {
		const mod = await import('./session');
		const result = await mod.decode_session(null);
		expect(result).toBeNull();
	});
});

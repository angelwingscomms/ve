import type { Ve } from '$lib/types/ve';

export function is_due(v: Ve, now: number): boolean {
	if (!v.r) return false;
	if (v.c === 'sampling' && !v.x) return false;
	if (!v.l) return true;
	return now - v.l >= v.r;
}

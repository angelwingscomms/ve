// Client helpers for the local BYOK generation service worker (static/gen-sw.js).

export interface GenVe {
	id: string;
	kind: 'v' | 'p';
	model: string;
	prompt: string;
	resolution?: string;
	duration?: number;
}

export type GenMessage =
	| { type: 'status'; id: string; c: string; err?: string }
	| { type: 'progress'; id: string; status: string }
	| { type: 'done'; id: string; w: string };

export async function initGen(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
	try {
		await navigator.serviceWorker.register('/gen-sw.js');
		if (!navigator.serviceWorker.controller) {
			await new Promise<void>((resolve) => {
				const handler = () => {
					navigator.serviceWorker.removeEventListener('controllerchange', handler);
					resolve();
				};
				navigator.serviceWorker.addEventListener('controllerchange', handler);
			});
		}
		return true;
	} catch {
		return false;
	}
}

function ctrl(): ServiceWorker | null {
	return navigator.serviceWorker.controller;
}

export function setGenKey(key: string): void {
	ctrl()?.postMessage({ type: 'key', key });
}

export function addLocalVe(id: string): void {
	ctrl()?.postMessage({ type: 'local', id });
}

export function generate(ve: GenVe, key: string): void {
	ctrl()?.postMessage({ type: 'generate', ve, key });
}

export function pingGen(key?: string): void {
	ctrl()?.postMessage(key ? { type: 'ping', key } : { type: 'ping' });
}

export function onGen(cb: (m: GenMessage) => void): () => void {
	if (typeof BroadcastChannel === 'undefined') return () => {};
	const ch = new BroadcastChannel('ve-gen');
	const handler = (e: MessageEvent) => cb(e.data as GenMessage);
	ch.addEventListener('message', handler);
	return () => ch.close();
}

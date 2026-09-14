/* ve — local BYOK generation service worker.
 *
 * Runs OpenRouter image/video generation in the browser using the user's own
 * API key (BYOK), so the AI gen features work locally without Cloudflare
 * Workflows. It also acts as a best-effort scheduler for repeating ("ve"s with
 * a period): it checks for due generations on startup / page ping / periodic
 * sync and resumes any in-progress jobs after a restart.
 *
 * NOTE: cross-origin fetches to OpenRouter are subject to CORS. This assumes
 * OpenRouter allows browser requests from the app origin. The OpenRouter key
 * is stored in IndexedDB (plain text) — acceptable for a local/BYOK dev flow.
 */

const CHANNEL = 've-gen';
const OR = 'https://openrouter.ai/api/v1';
const POLL_MS = 60_000;
const MAX_POLLS = 35;

const inFlight = new Set();

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			await self.clients.claim();
			try {
				await runDue();
			} catch (err) {
				console.error('[gen-sw] runDue failed', err);
			}
		})()
	);
});

self.addEventListener('message', (event) => {
	const d = event.data || {};
	switch (d.type) {
		case 'key':
			event.waitUntil(setKey(d.key));
			break;
		case 'local':
			event.waitUntil(addLocal(d.id));
			break;
		case 'ping':
			event.waitUntil(runDue());
			break;
		case 'generate':
			if (d.ve && d.key) {
				event.waitUntil((async () => {
					await setKey(d.key);
					await addLocal(d.ve.id);
					await runOne(d.ve, d.key);
				})());
			}
			break;
	}
});

// Chromium-only best-effort wake when the tab is closed.
self.addEventListener('periodicsync', (event) => {
	event.waitUntil(runDue());
});

/* ----------------------------- storage ----------------------------- */

function openDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open('ve-gen', 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function dbGet(key) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('kv', 'readonly');
		const req = tx.objectStore('kv').get(key);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function dbSet(key, val) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('kv', 'readwrite');
		tx.objectStore('kv').put(val, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function getKey() {
	return (await dbGet('key')) || '';
}
async function setKey(k) {
	await dbSet('key', k || '');
}
async function getLocal() {
	return (await dbGet('local')) || [];
}
async function addLocal(id) {
	const set = new Set(await getLocal());
	set.add(id);
	await dbSet('local', [...set]);
}

/* --------------------------- messaging --------------------------- */

function broadcast(msg) {
	try {
		new BroadcastChannel(CHANNEL).postMessage(msg);
	} catch {}
	self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
		clients.forEach((c) => c.postMessage(msg));
	});
}

/* ----------------------- result persistence ----------------------- */

async function saveResult(id, body) {
	await fetch(`/api/ves/${id}/result`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/* ---------------------------- generation --------------------------- */

async function runOne(ve, key) {
	if (inFlight.has(ve.id)) return;
	inFlight.add(ve.id);
	try {
		broadcast({ type: 'status', id: ve.id, c: 'active' });
		await saveResult(ve.id, { c: 'active' });
		if (ve.kind === 'p') {
			broadcast({ type: 'status', id: ve.id, c: 'active' });
			const r = await fetch(`${OR}/images`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: ve.model,
					prompt: ve.prompt,
					...(ve.resolution ? { resolution: ve.resolution } : {})
				})
			});
			if (!r.ok) {
				const t = await r.text();
				await saveResult(ve.id, { c: 'failed' });
				broadcast({ type: 'status', id: ve.id, c: 'failed', err: t.slice(0, 200) });
				return;
			}
			const s = await r.json();
			const d0 = s.data && s.data[0];
			let w = d0 && d0.url;
			if (!w && d0 && d0.b64_json) w = `data:${d0.media_type || 'image/png'};base64,${d0.b64_json}`;
			if (!w) {
				await saveResult(ve.id, { c: 'failed' });
				broadcast({ type: 'status', id: ve.id, c: 'failed' });
				return;
			}
			await saveResult(ve.id, { w });
			broadcast({ type: 'done', id: ve.id, w });
		} else {
			broadcast({ type: 'status', id: ve.id, c: 'active' });
			const body = { model: ve.model, prompt: ve.prompt };
			if (ve.duration) body.duration = ve.duration;
			if (ve.resolution) body.resolution = ve.resolution;
			const r = await fetch(`${OR}/videos`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!r.ok) {
				const t = await r.text();
				await saveResult(ve.id, { c: 'failed' });
				broadcast({ type: 'status', id: ve.id, c: 'failed', err: t.slice(0, 200) });
				return;
			}
			const job = await r.json();
			if (job.id) await saveResult(ve.id, { j: job.id });
			const w = await pollVideo(job.polling_url || `${OR}/videos/${job.id}`, key, ve.id);
			if (w) {
				await saveResult(ve.id, { w });
				broadcast({ type: 'done', id: ve.id, w });
			} else {
				await saveResult(ve.id, { c: 'failed' });
				broadcast({ type: 'status', id: ve.id, c: 'failed' });
			}
		}
	} catch (err) {
		console.error('[gen-sw] generation error', ve.id, err);
		await saveResult(ve.id, { c: 'failed' });
		broadcast({ type: 'status', id: ve.id, c: 'failed' });
	} finally {
		inFlight.delete(ve.id);
	}
}

async function pollVideo(pollingUrl, key, id) {
	for (let n = 0; n < MAX_POLLS; n++) {
		await new Promise((res) => setTimeout(res, POLL_MS));
		try {
			const pr = await fetch(pollingUrl, { headers: { Authorization: `Bearer ${key}` } });
			if (!pr.ok) continue;
			const st = await pr.json();
			broadcast({ type: 'progress', id, status: st.status });
			if (st.status === 'completed') return (st.unsigned_urls && st.unsigned_urls[0]) || '';
			if (st.status === 'failed' || st.status === 'expired' || st.status === 'cancelled') return '';
		} catch {}
	}
	return '';
}

// Resume an in-progress video using the stored OpenRouter job id.
async function resumeVideo(ve, key) {
	if (inFlight.has(ve.id)) return;
	if (!ve.j) return runOne(ve, key);
	inFlight.add(ve.id);
	try {
		const w = await pollVideo(`${OR}/videos/${ve.j}`, key, ve.id);
		if (w) {
			await saveResult(ve.id, { w });
			broadcast({ type: 'done', id: ve.id, w });
		} else {
			await saveResult(ve.id, { c: 'failed' });
			broadcast({ type: 'status', id: ve.id, c: 'failed' });
		}
	} finally {
		inFlight.delete(ve.id);
	}
}

/* ----------------------------- scheduler --------------------------- */

async function runDue() {
	const key = await getKey();
	if (!key) return;
	const local = await getLocal();
	if (!local.length) return;
	const localSet = new Set(local);

	let ves = [];
	try {
		const r = await fetch('/api/ves', { credentials: 'include' });
		if (!r.ok) return;
		ves = (await r.json()).ves || [];
	} catch {
		return;
	}

	for (const ve of ves) {
		if (!localSet.has(ve.i)) continue;

		// Resume in-progress jobs (e.g. after a service worker restart).
		if (ve.c === 'active') {
			if (ve.k === 'v' && ve.j) resumeVideo(ve, key);
			else if (ve.k === 'p') runOne(ve, key);
			continue;
		}

		// Fire repeating generations whose period has elapsed.
		if (ve.r > 0 && ve.c !== 'paused' && (ve.l || 0) + ve.r <= Date.now()) {
			broadcast({ type: 'status', id: ve.i, c: 'active' });
			runOne(
				{ id: ve.i, kind: ve.k || 'v', model: ve.m, prompt: ve.p, resolution: ve.z, duration: ve.g },
				key
			);
		}
	}
}

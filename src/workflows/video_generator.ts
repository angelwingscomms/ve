import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';

type Params = { ve_id: string };

type Cfg = { p: string; m: string; g?: number; z?: string; r: number; y?: number };

export class VideoGeneratorWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const ve_id = event.payload.ve_id;

		const cfg = await step.do('load', async () => {
			const r = await fetch(`${this.env.ORIGIN}/api/internal/ve?i=${ve_id}`, {
				headers: { 'x-internal-key': this.env.INTERNAL_KEY }
			});
			if (!r.ok) return null;
			return (await r.json()) as Cfg;
		});
		if (!cfg || !cfg.r || cfg.r <= 0) return;

		try {
			await step.do('active', async () => {
				await fetch(`${this.env.ORIGIN}/api/ves/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
					body: JSON.stringify({ id: ve_id, c: 'active' })
				});
			});

			const job = await step.do('submit', async () => {
				const key = await this.or_key(ve_id);
				if (!key) throw new NonRetryableError('no openrouter key');
				const body: Record<string, unknown> = { model: cfg.m, prompt: cfg.p };
				if (cfg.g) body.duration = cfg.g;
				if (cfg.z) body.resolution = cfg.z;
				const r = await fetch('https://openrouter.ai/api/v1/videos', {
					method: 'POST',
					headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (!r.ok) {
					const t = await r.text();
					if (r.status === 429 || r.status >= 500) throw new Error(t);
					throw new NonRetryableError(t);
				}
				return (await r.json()) as { id: string; polling_url?: string };
			});

			const w = await step.do('poll', async () => {
				const key = await this.or_key(ve_id);
				if (!key) throw new NonRetryableError('no openrouter key');
				const url = job.polling_url || `https://openrouter.ai/api/v1/videos/${job.id}`;
				let n = 0;
				while (n < 35) {
					n++;
					await new Promise((res) => setTimeout(res, 60_000));
					try {
						const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
						if (!r.ok) continue;
						const s = (await r.json()) as { status?: string; unsigned_urls?: string[] };
						if (s.status === 'completed') return (s.unsigned_urls?.[0] as string) || '';
						if (s.status === 'failed' || s.status === 'expired' || s.status === 'cancelled')
							throw new Error(`gen ${s.status}`);
					} catch (e) {
						if (e instanceof NonRetryableError) throw e;
					}
				}
				throw new Error('poll timeout');
			});

			await step.do('save', async () => {
				await fetch(`${this.env.ORIGIN}/api/internal/ve/done`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
					body: JSON.stringify({ i: ve_id, w })
				});
			});

			if (cfg.y) {
				await step.do('yt', async () => {
					await fetch(`${this.env.ORIGIN}/api/internal/ve/yt`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
						body: JSON.stringify({ i: ve_id })
					});
				});
			}
		} catch (e) {
			console.error('ve generation failed', ve_id, e);
		}

		await step.sleep('wait', cfg.r);

		const next = await step.do('recheck', async () => {
			const r = await fetch(`${this.env.ORIGIN}/api/internal/ve?i=${ve_id}`, {
				headers: { 'x-internal-key': this.env.INTERNAL_KEY }
			});
			if (!r.ok) return null;
			const d = (await r.json()) as { r: number } | null;
			return d && d.r > 0 ? d : null;
		});
		if (next) {
			const inst = await this.env.VIDEO_WORKFLOW.create({
				id: `ve_${ve_id}_${Date.now()}`,
				params: { ve_id }
			});
			await fetch(`${this.env.ORIGIN}/api/internal/ve/inst`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
				body: JSON.stringify({ i: ve_id, n: inst.id })
			});
		}
	}

	private async or_key(ve_id: string): Promise<string | null> {
		const r = await fetch(`${this.env.ORIGIN}/api/internal/ve/key?i=${ve_id}`, {
			headers: { 'x-internal-key': this.env.INTERNAL_KEY }
		});
		if (!r.ok) return null;
		const d = (await r.json()) as { a_o?: string };
		return d.a_o || null;
	}
}

export default { async fetch() { return new Response(null, { status: 404 }) } };

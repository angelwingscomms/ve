import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';

type Params = { ve_id: string };

type Cfg = { p: string; m: string; g?: number; z?: string; r: number; y?: number; x?: number; j?: string };

type OrEvent = {
	type?: string;
	data?: { status?: string; unsigned_urls?: string[] };
};

export class VideoGeneratorWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const ve_id = event.payload.ve_id;

		const cfg = await step.do('load', async () => {
			await fetch(`${this.env.ORIGIN}/api/internal/ve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
				body: JSON.stringify({ i: ve_id, n: event.instanceId })
			});
			const r = await fetch(`${this.env.ORIGIN}/api/internal/ve?i=${ve_id}`, {
				headers: { 'x-internal-key': this.env.INTERNAL_KEY }
			});
			if (!r.ok) return null;
			return (await r.json()) as Cfg;
		});
		if (!cfg) return;
		if (!cfg.r && !cfg.x) return;

		try {
			await step.do('active', async () => {
				await fetch(`${this.env.ORIGIN}/api/ves/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
					body: JSON.stringify({ id: ve_id, c: 'sampling' })
				});
			});

			if (cfg.x) {
				await step.do('test_yt', async () => {
					const r = await fetch(`${this.env.ORIGIN}/api/internal/ve/test_yt`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
						body: JSON.stringify({ i: ve_id })
					});
					if (!r.ok) throw new Error('test yt upload failed');
				});
			} else {
				await step.do('submit', async () => {
					const key = await this.or_key(ve_id);
					if (!key) throw new NonRetryableError('no openrouter key');
					const body: Record<string, unknown> = {
						model: cfg.m,
						prompt: cfg.p,
						callback_url: `${this.env.ORIGIN}/api/internal/ve/hook?k=${this.env.INTERNAL_KEY}`
					};
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
					const job = (await r.json()) as { id: string };
					await fetch(`${this.env.ORIGIN}/api/internal/ve`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
						body: JSON.stringify({ i: ve_id, j: job.id })
					});
					return job;
				});

				const ev = await step.waitForEvent<OrEvent>('wait', { type: 'or', timeout: '2 hours' });
				const status = ev?.data?.status;
				if (status !== 'completed') {
					await step.do('fail', async () => {
						await fetch(`${this.env.ORIGIN}/api/ves/status`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
							body: JSON.stringify({ id: ve_id, c: 'failed' })
						});
					});
					return;
				}

				const w = ev.data?.unsigned_urls?.[0] || '';
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
			}
		} catch (e) {
			console.error('ve generation failed', ve_id, e);
			await step.do('failed', async () => {
				await fetch(`${this.env.ORIGIN}/api/ves/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
					body: JSON.stringify({ id: ve_id, c: 'failed' })
				});
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

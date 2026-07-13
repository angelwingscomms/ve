import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';

type Params = { ve_id: string };

type Cfg = { p: string; m: string; k?: string; ar?: string };

export class ImageGeneratorWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const ve_id = event.payload.ve_id;

		const cfg = await step.do('load', async () => {
			const r = await fetch(`${this.env.ORIGIN}/api/internal/ve?i=${ve_id}`, {
				headers: { 'x-internal-key': this.env.INTERNAL_KEY }
			});
			if (!r.ok) return null;
			return (await r.json()) as Cfg;
		});
		if (!cfg) return;
		if (cfg.k !== 'p') return;

		try {
			await step.do('active', async () => {
				await fetch(`${this.env.ORIGIN}/api/ves/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
					body: JSON.stringify({ id: ve_id, c: 'active' })
				});
			});

			const w = await step.do('gen', async () => {
				const key = await this.or_key(ve_id);
				if (!key) throw new NonRetryableError('no openrouter key');
				const body: Record<string, unknown> = { model: cfg.m, prompt: cfg.p };
				if (cfg.ar) body.aspect_ratio = cfg.ar;
				const r = await fetch('https://openrouter.ai/api/v1/images', {
					method: 'POST',
					headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (!r.ok) {
					const t = await r.text();
					if (r.status === 429 || r.status >= 500) throw new Error(t);
					throw new NonRetryableError(t);
				}
				const s = (await r.json()) as {
					data?: { url?: string; b64_json?: string; media_type?: string }[];
				};
				const d = s.data?.[0];
				if (!d) throw new NonRetryableError('no image returned');
				if (d.url) return d.url;
				if (d.b64_json) return `data:${d.media_type || 'image/png'};base64,${d.b64_json}`;
				throw new NonRetryableError('no image data');
			});

			await step.do('save', async () => {
				await fetch(`${this.env.ORIGIN}/api/internal/ve/done`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
					body: JSON.stringify({ i: ve_id, w })
				});
			});
		} catch (e) {
			console.error('image generation failed', ve_id, e);
			await fetch(`${this.env.ORIGIN}/api/internal/ve/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
				body: JSON.stringify({ id: ve_id, c: 'failed' })
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

export default {
	async fetch() {
		return new Response(null, { status: 404 });
	}
};

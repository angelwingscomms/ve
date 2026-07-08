import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

type P = { ve_id: string; user_id: string; prompt: string; model: string; duration?: number };

export class VideoGeneratorWorkflow extends WorkflowEntrypoint<Env, P> {
	async run(event: WorkflowEvent<P>, step: WorkflowStep) {
		const { ve_id } = event.payload;

		await step.do('generate', async () => {
			await this.status(ve_id, 'active');

			const body: Record<string, unknown> = { model: event.payload.model, prompt: event.payload.prompt };
			if (event.payload.duration) body.duration = event.payload.duration;

			for (let attempt = 1; attempt <= 5; attempt++) {
				try {
					const r = await fetch('https://openrouter.ai/api/v1/videos', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${this.env.OPENROUTER_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(body)
					});

					if (!r.ok) {
						const bodyText = await r.text();
						if (r.status === 429 || r.status >= 500) throw new Error(bodyText);
						throw new NonRetryableError(bodyText);
					}

					await this.status(ve_id, 'done');
					return;
				} catch (e) {
					if (e instanceof NonRetryableError || attempt === 5) {
						await this.status(ve_id, 'failed');
						await this.retries(ve_id);
						throw e;
					}
					const delay = Math.min(2000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 60000);
					await step.sleep(`backoff-${attempt}`, `${delay} milliseconds`);
				}
			}
		});
	}

	private async status(id: string, c: string) {
		await fetch(`${this.env.ORIGIN}/api/ves/status`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
			body: JSON.stringify({ id, c })
		});
	}

	private async retries(id: string) {
		await fetch(`${this.env.ORIGIN}/api/ves/retries`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
			body: JSON.stringify({ id })
		});
	}
}

class NonRetryableError extends Error {}

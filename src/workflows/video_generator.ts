import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

type P = { vid_id: string; user_id: string; prompt: string; model: string };

export class VideoGeneratorWorkflow extends WorkflowEntrypoint<Env, P> {
	async run(event: WorkflowEvent<P>, step: WorkflowStep) {
		const { vid_id } = event.payload;

		await step.do('generate', async () => {
			await this.status(vid_id, 'active');

			for (let attempt = 1; attempt <= 5; attempt++) {
				try {
					const r = await fetch('https://openrouter.ai/api/v1/video', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${this.env.OPENROUTER_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ model: event.payload.model, prompt: event.payload.prompt })
					});

					if (!r.ok) {
						const body = await r.text();
						if (r.status === 429 || r.status >= 500) throw new Error(body);
						throw new NonRetryableError(body);
					}

					await this.status(vid_id, 'done');
					return;
				} catch (e) {
					if (e instanceof NonRetryableError || attempt === 5) {
						await this.status(vid_id, 'failed');
						await this.retries(vid_id);
						throw e;
					}
					const delay = Math.min(2000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 60000);
					await step.sleep(`backoff-${attempt}`, `${delay} milliseconds`);
				}
			}
		});
	}

	private async status(id: string, c: string) {
		await fetch(`${this.env.ORIGIN}/api/vids/status`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
			body: JSON.stringify({ id, c })
		});
	}

	private async retries(id: string) {
		await fetch(`${this.env.ORIGIN}/api/vids/retries`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
			body: JSON.stringify({ id })
		});
	}
}

class NonRetryableError extends Error {}

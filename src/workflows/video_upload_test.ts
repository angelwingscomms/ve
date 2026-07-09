import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';

type TestParams = { r2_key: string; title: string; period: number };

export class VideoUploadTestWorkflow extends WorkflowEntrypoint<Env, TestParams> {
	async run(event: WorkflowEvent<TestParams>, step: WorkflowStep) {
		await step.do('upload', async () => {
			const r = await fetch(`${this.env.ORIGIN}/api/internal/test/yt`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-internal-key': this.env.INTERNAL_KEY },
				body: JSON.stringify({ r2_key: event.payload.r2_key, title: event.payload.title })
			});
			if (!r.ok) throw new Error('yt upload failed');
		});

		await step.sleep('wait', event.payload.period);

		const keep = await step.do('recheck', async () => {
			const obj = await this.env.TEST_BUCKET.get(event.payload.r2_key);
			return obj !== null;
		});

		if (keep) {
			const inst = await this.env.TEST_WORKFLOW.create({
				id: `test_${Date.now()}`,
				params: event.payload
			});
		}
	}
}

export default { async fetch() { return new Response(null, { status: 404 }) } };

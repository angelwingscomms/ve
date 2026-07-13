import { env } from 'cloudflare:workers';
import { introspectWorkflow, introspectWorkflowInstance } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('ImageGeneratorWorkflow', () => {
	it('generates and saves an image when k is p', async () => {
		const global = await introspectWorkflow(env.IMAGE_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.IMAGE_WORKFLOW, 'img-ok-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'cat', m: 'or/img', k: 'p', z: '1K' });
				await m.mockStepResult({ name: 'active' }, true);
				await m.mockStepResult({ name: 'gen' }, 'https://example.com/i.png');
				await m.mockStepResult({ name: 'save' }, true);
			});

			await env.IMAGE_WORKFLOW.create({ id: 'img-ok-1', params: { ve_id: 'img-ok-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			const chained = instances.filter(i => i.id !== 'img-ok-1');
			expect(chained.length).toBe(1);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('does nothing when k is not p', async () => {
		const global = await introspectWorkflow(env.IMAGE_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.IMAGE_WORKFLOW, 'img-skip-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'cat', m: 'or/img', k: 'v', r: 0 });
				await m.mockStepResult({ name: 'active' }, true);
			});

			await env.IMAGE_WORKFLOW.create({ id: 'img-skip-1', params: { ve_id: 'img-skip-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			const chained = instances.filter(i => i.id !== 'img-skip-1');
			expect(chained.length).toBe(1);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);
});

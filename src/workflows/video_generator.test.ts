import { env } from 'cloudflare:workers';
import { introspectWorkflowInstance, introspectWorkflow } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

const done = {
	type: 'or',
	payload: {
		type: 'video.generation.completed',
		data: { id: 'job-1', status: 'completed', unsigned_urls: ['https://example.com/v.mp4'] }
	}
};

describe('VideoGeneratorWorkflow one-shot', () => {
	it('does not self-chain after a completed run', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-oneshot-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'test', m: 'or/model', r: 60000, y: 0 });
				await m.mockStepResult({ name: 'active' }, true);
				await m.mockStepResult({ name: 'submit' }, { id: 'job-1' });
				await m.mockEvent(done);
				await m.mockStepResult({ name: 'save' }, true);
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-oneshot-1', params: { ve_id: 'test-oneshot-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			expect(instances.filter((i) => i.id !== 'test-oneshot-1').length).toBe(0);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('includes yt step when cfg.y is set', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-yt-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'test', m: 'or/model', r: 60000, y: 1 });
				await m.mockStepResult({ name: 'active' }, true);
				await m.mockStepResult({ name: 'submit' }, { id: 'job-3' });
				await m.mockEvent({
					type: 'or',
					payload: {
						type: 'video.generation.completed',
						data: { id: 'job-3', status: 'completed', unsigned_urls: ['https://example.com/v.mp4'] }
					}
				});
				await m.mockStepResult({ name: 'save' }, true);
				await m.mockStepResult({ name: 'yt' }, true);
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-yt-1', params: { ve_id: 'test-yt-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			expect(instances.filter((i) => i.id !== 'test-yt-1').length).toBe(0);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('runs test_yt step when cfg.x is set', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-x-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'test', m: '', r: 60000, y: 0, x: 1, j: 'test/key' });
				await m.mockStepResult({ name: 'active' }, true);
				await m.mockStepResult({ name: 'test_yt' }, true);
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-x-1', params: { ve_id: 'test-x-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			expect(instances.filter((i) => i.id !== 'test-x-1').length).toBe(0);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('stops when load returns null', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-fail-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, null);
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-fail-1', params: { ve_id: 'test-fail-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			expect(instances.filter((i) => i.id !== 'test-fail-1').length).toBe(0);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);
});

import { env } from 'cloudflare:workers';
import { introspectWorkflowInstance, introspectWorkflow } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('VideoGeneratorWorkflow pause behavior', () => {
	it('does not self-chain when recheck returns null (pause)', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-pause-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'test', m: 'or/model', r: 60000, y: 0 });
				await m.mockStepResult({ name: 'submit' }, { id: 'job-1', polling_url: 'http://localhost/poll' });
				await m.mockStepResult({ name: 'poll' }, 'https://example.com/v.mp4');
				await m.mockStepResult({ name: 'recheck' }, null);
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-pause-1', params: { ve_id: 'test-pause-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			const chained = instances.filter(i => i.id !== 'test-pause-1');
			expect(chained.length).toBe(1);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('does not self-chain when load returns null (fetch failure)', async () => {
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
			const chained = instances.filter(i => i.id !== 'test-fail-1');
			expect(chained.length).toBe(1);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('does not self-chain when load returns r=0 (sample, not paused)', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-r0-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'test', m: 'or/model', r: 0, y: 0 });
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-r0-1', params: { ve_id: 'test-r0-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			const chained = instances.filter(i => i.id !== 'test-r0-1');
			expect(chained.length).toBe(1);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	it('does self-chain when recheck returns active config (r > 0)', async () => {
		const global = await introspectWorkflow(env.VIDEO_WORKFLOW);
		const instance = await introspectWorkflowInstance(env.VIDEO_WORKFLOW, 'test-chain-1');
		try {
			await instance.modify(async (m) => {
				await m.disableSleeps();
				await m.mockStepResult({ name: 'load' }, { p: 'test', m: 'or/model', r: 60000, y: 0 });
				await m.mockStepResult({ name: 'submit' }, { id: 'job-2', polling_url: 'http://localhost/poll' });
				await m.mockStepResult({ name: 'poll' }, 'https://example.com/v.mp4');
				await m.mockStepResult({ name: 'recheck' }, { r: 60000 });
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-chain-1', params: { ve_id: 'test-chain-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			const chained = instances.filter(i => i.id !== 'test-chain-1');
			expect(chained.length).toBe(2);
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
				await m.mockStepResult({ name: 'submit' }, { id: 'job-3', polling_url: 'http://localhost/poll' });
				await m.mockStepResult({ name: 'poll' }, 'https://example.com/v.mp4');
				await m.mockStepResult({ name: 'recheck' }, null);
			});

			await env.VIDEO_WORKFLOW.create({ id: 'test-yt-1', params: { ve_id: 'test-yt-1' } });
			await instance.waitForStatus('complete');

			const instances = await global.get();
			const chained = instances.filter(i => i.id !== 'test-yt-1');
			expect(chained.length).toBe(1);
		} finally {
			await instance.dispose();
			await global.dispose();
		}
	}, 30_000);

	
});
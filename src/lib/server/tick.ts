import { add_ve_inst, list_ves } from './ve';
import { is_due } from './due';

type Wf = {
	create: (o: { id: string; params: { ve_id: string } }) => Promise<{ id: string }>;
};

export async function run_tick(env: { VIDEO_WORKFLOW?: Wf }, now = Date.now()): Promise<number> {
	if (!env.VIDEO_WORKFLOW) return 0;
	let n = 0;
	for (const v of await list_ves()) {
		if (!is_due(v, now)) continue;
		try {
			const inst = await env.VIDEO_WORKFLOW.create({
				id: `ve_${v.i}_${now}`,
				params: { ve_id: v.i }
			});
			await add_ve_inst(v.i, inst.id);
			n++;
		} catch (e) {
			console.error('tick start failed', v.i, e);
		}
	}
	return n;
}

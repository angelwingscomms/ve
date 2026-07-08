import { redirect, fail } from '@sveltejs/kit';
import { list_vids, save_vid } from '$lib/server/vid';
import { get_user, update_user_api_keys } from '$lib/server/user';
import { get_video_models } from '$lib/server/openrouter';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const [vids, u] = await Promise.all([
		list_vids(locals.user.id),
		get_user({}, locals.user.id)
	]);

	let models = null;
	if (u?.a?.o) {
		try { models = await get_video_models(u.a.o); } catch {}
	}

	return { vids, user_data: u, models };
};

export const actions = {
	async save_key({ locals, request }) {
		if (!locals.user) return fail(401);
		const d = await request.formData();
		const key = d.get('key') as string;
		if (!key) return fail(400, { key_missing: true });
		await update_user_api_keys({}, locals.user.id, { o: key });
		return { key_saved: true };
	},

	async create({ locals, request }) {
		if (!locals.user) return fail(401);
		const d = await request.formData();
		const prompt = d.get('p') as string;
		const model = d.get('m') as string;
		const period = parseInt(d.get('r') as string) || 86400000;
		if (!prompt || !model) return fail(400, { missing: true });
		const id = crypto.randomUUID();
		await save_vid(id, locals.user.id, prompt, model, period);
		return { created: id };
	}
};

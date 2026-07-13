import { redirect, fail } from '@sveltejs/kit';
import { list_ves, save_ve } from '$lib/server/ve';
import { get_user, update_user_api_keys } from '$lib/server/user';
import { get_video_models, get_image_models } from '$lib/server/openrouter';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const [ves, u] = await Promise.all([list_ves(locals.user.id), get_user({}, locals.user.id)]);

	let models = null;
	let image_models = null;
	if (u?.a?.o) {
		try {
			models = await get_video_models(u.a.o);
		} catch {}
		try {
			image_models = await get_image_models(u.a.o);
		} catch {}
	}

	return { ves, user_data: u, models, image_models };
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
		const duration = parseInt(d.get('g') as string) || undefined;
		if (!prompt || !model) return fail(400, { missing: true });
		const id = crypto.randomUUID();
		await save_ve(id, locals.user.id, prompt, model, period, duration);
		return { created: id };
	}
};

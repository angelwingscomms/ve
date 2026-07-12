import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { get_user } from '$lib/server/user';
import { list_test_ves } from '$lib/server/ve';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');
	const u = await get_user(event, event.locals.user.id);
	const test_ves = await list_test_ves(event.locals.user.id);
	return { user_data: u, test_ves };
};

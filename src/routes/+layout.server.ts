import { decode_session } from '$lib/server/session';
import { get_user } from '$lib/server/user';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const session_id = cookies.get('session');
	if (!session_id) return { user: null, user_data: null };

	const s = await decode_session(session_id);
	if (!s) return { user: null, user_data: null };

	const u = await get_user({}, s.user.id);
	return { user: s.user, user_data: u };
};

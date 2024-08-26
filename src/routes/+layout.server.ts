import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
	const session = await locals.auth();

    if (!session || !session.user || !session.user.email) {
        throw redirect(307, '/auth');
    }
	return {
		user: session ? session.user : null
	};
}

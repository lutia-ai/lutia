export async function load({ locals }) {
	const session = await locals.auth();
	return {
		user: session ? session.user : null
	};
}

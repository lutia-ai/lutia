import { error, json } from '@sveltejs/kit';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { retrieveUserRequestsInDateRange } from '$lib/db/crud/apiRequest';

export async function GET({ locals, url }) {
    let session = await locals.auth();
	if (!session || !session.user) {
		throw error(401, 'Forbidden');
	}

    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
        return json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    try {

        const apiRequests = await retrieveUserRequestsInDateRange(
            Number(session.user.id!), 
            new Date(startDate), 
            new Date(endDate)
        );
        
        return json({ apiRequests });
    } catch (error) {
        console.error('Error retrieving API requests:', error);
        return json({ error: 'Failed to retrieve API requests' }, { status: 500 });
    }
}

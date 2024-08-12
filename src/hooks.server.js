import { SvelteKitAuth } from "@auth/sveltekit"
import Google from "@auth/core/providers/google";
import { 
	SECRET_GOOGLE_CLIENT_ID, 
	SECRET_GOOGLE_CLIENT_SECRET,
	SECRET_AUTH
} from '$env/static/private';

const auth = SvelteKitAuth({
  	providers: [
    	Google({ 
      		clientId: SECRET_GOOGLE_CLIENT_ID, 
      		clientSecret: SECRET_GOOGLE_CLIENT_SECRET ,
      		authorization: {
      			params: {
      				scope: "openid email profile",
      			}
      		}
    	})
  	],
  	secret: SECRET_AUTH
});

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  	return auth.handle({ event, resolve });
}
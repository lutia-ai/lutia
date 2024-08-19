import bcrypt from 'bcrypt';
import { SvelteKitAuth } from '@auth/sveltekit';
import type { SvelteKitAuthConfig } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import { SECRET_GOOGLE_CLIENT_ID, SECRET_GOOGLE_CLIENT_SECRET, SECRET_AUTH } from '$env/static/private';
import Credentials from '@auth/core/providers/credentials';
import { retrieveUserByEmail, createUser } from '$lib/db/crud/user';


export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
    const authOptions: SvelteKitAuthConfig = {
        providers: [
            Google({
                clientId: SECRET_GOOGLE_CLIENT_ID,
                clientSecret: SECRET_GOOGLE_CLIENT_SECRET,
                authorization: {
                    params: {
                        scope: 'openid email profile'
                    }
                }
            }),
            Credentials({
                async authorize(credentials) {
                    if (typeof credentials.email === 'string' && typeof credentials.password === 'string') {
                        const isValid = await verifyCredentials(credentials.email, credentials.password);
                        if (isValid) {
                            const user = await retrieveUserByEmail(credentials.email);
                            if (user) {
                                return {
                                    id: user.id.toString(),
                                    email: user.email,
                                    name: user.name
                                };
                            }
                        }
                        console.error('Credentials are invalid');
                    }
                    return null;
                }
            })
        ],
        callbacks: {
            async signIn({ user, account, profile }) {
                if (account?.provider === "google") {
                    try {
                        let existingUser = await retrieveUserByEmail(user.email!);
                        console.log(existingUser);
                        if (existingUser && !existingUser.oauth) {
                            throw new Error('ExistingNonOAuthUser');
                        }
                        if (!existingUser) {
                            const userData = {
                                email: user.email!,
                                name: user.name!, 
                                oauth: 'google'
                            };
                            existingUser = await createUser(userData);
                        }
                        return true;
                    } catch (error) {
                        if (error instanceof Error && error.message === 'ExistingNonOAuthUser') {
                            return '/auth?error=ExistingNonOAuthUser';
                        }
                        console.error("Error saving user to database: ", error);
                        return false;
                    }
                }
                return true;
            },
        },
        pages: {
            signIn: '/auth',
            error: '/auth'
        },
        secret: SECRET_AUTH,
        trustHost: true
    };
    return authOptions;
});


export async function verifyCredentials(email: string, password: string) {
    const user = await retrieveUserByEmail(email);
    if (!user || !user.password_hash) {
        return null;
    }
    return await bcrypt.compare(password, user.password_hash);
}
import bcryptjs from 'bcryptjs';
import { CredentialsSignin, SvelteKitAuth } from '@auth/sveltekit';
import type { SvelteKitAuthConfig } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import { env } from '$env/dynamic/private';
import Credentials from '@auth/core/providers/credentials';
import { retrieveUserByEmail, createUser, updateUser } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/customErrors';
import type { User } from '@prisma/client';
import crypto from 'crypto';
import { sendEmail, verifyEmailBody } from '$lib/email';

let requestBody: any;

export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
	if (event.request.body) {
		requestBody = await event.request;
	}
	const authOptions: SvelteKitAuthConfig = {
		providers: [
			Google({
				clientId: env.SECRET_GOOGLE_CLIENT_ID,
				clientSecret: env.SECRET_GOOGLE_CLIENT_SECRET,
				authorization: {
					params: {
						scope: 'openid email profile'
					}
				}
			}),
			Credentials({
				async authorize(credentials) {
					if (
						typeof credentials.email === 'string' &&
						typeof credentials.password === 'string'
					) {
						try {
							let user: User = await retrieveUserByEmail(credentials.email);
							const isValid = await verifyCredentials(
								user,
								credentials.email,
								credentials.password
							);
							if (isValid) {
								if (!user.email_verified) {
									const emailToken = generateRandomSixDigitNumber();
									user = await updateUser(user.id, { email_code: emailToken });
									await sendEmail(
										'verify-email@lutia.ai',
										user.email,
										'Verify your email',
										verifyEmailBody(emailToken)
									);
								}

								return {
									id: user.id.toString(),
									email: user.email,
									name: user.name
								};
							}
						} catch (error) {
							if (error instanceof UserNotFoundError) {
								return null;
							}
							throw error;
						}
					}
					return null;
				}
			})
		],
		callbacks: {
			async signIn({ user, account }) {
				if (account?.provider === 'google') {
					try {
						let existingUser;
						const url = new URL(requestBody.url);
						const linkingToken = url.searchParams.get('linkingToken');
						requestBody = undefined;

						try {
							existingUser = await retrieveUserByEmail(user.email!);
						} catch (UserNotFoundError) {
							if (linkingToken) {
								// a new user can't link accounts
								throw new Error('WrongAccountLinking');
							}

							existingUser = await createUser(
								user.email!,
								user.name!,
								undefined,
								'google',
								undefined,
								undefined,
								true
							);
							user.id = existingUser!.id.toString();
							return true;
						}

						if (existingUser) {
							if (!existingUser.oauth) {
								if (linkingToken) {
									// Verify the linking token
									if (existingUser.oauth_link_token === linkingToken) {
										// Update the existing user to link with Google and clear the linking token
										await updateUser(existingUser.id, {
											oauth: 'google',
											oauth_link_token: undefined
										});
										return '/?success=AccountLinkSuccess';
									} else {
										throw new Error('InvalidLinkingToken');
									}
								}
								throw new Error('ExistingNonOAuthUser');
							}
							if (linkingToken) {
								// Account already exists and is an oauth acc so cant link again
								throw new Error('LinkingExistingOAuthAccount');
							}
							// Existing OAuth user, proceed with sign in
							user.id = existingUser.id.toString();
							return true;
						}
					} catch (error) {
						if (error instanceof Error && error.message === 'ExistingNonOAuthUser') {
							return `/auth?error=${error.message}`;
						}
						if (
							error instanceof Error &&
							(error.message === 'WrongAccountLinking' ||
								error.message === ' LinkingExistingOAuthAccount')
						) {
							return `/?error=${error.message}`;
						}
						console.error('Error saving user to database: ', error);
						return false;
					}
				}
				return true;
			},
			async jwt({ token, user }) {
				if (user) {
					token.user_id = user.id;
				}
				return token;
			},
			async session({ session, token }) {
				if (token.user_id) {
					(session.user as any).id = token.user_id;
				}
				return session;
			}
		},
		pages: {
			signIn: '/auth',
			error: '/auth'
		},
		secret: env.SECRET_AUTH,
		trustHost: true
	};
	return authOptions;
});

export async function verifyCredentials(
	user: User,
	email: string,
	password: string
): Promise<boolean> {
	try {
		if (!user.password_hash) {
			return false;
		}
		return await bcryptjs.compare(password, user.password_hash);
	} catch (error) {
		throw error;
	}
}

export function generateLinkingToken(): string {
	// Generate 32 bytes of random data
	const randomBytes = crypto.randomBytes(32);

	// Convert the random bytes to a hexadecimal string
	const token = randomBytes.toString('hex');

	return token;
}

export function generateRandomSixDigitNumber(): number {
	const min = 100000; // The smallest 6-digit number
	const max = 999999; // The largest 6-digit number
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

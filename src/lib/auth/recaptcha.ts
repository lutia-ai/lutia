// lib/utils/recaptcha.ts
import { env } from '$env/dynamic/private';

interface RecaptchaResponse {
    success: boolean;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

export async function verifyRecaptcha(token: string): Promise<boolean> {
    if (!token) return false;

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                secret: env.SECRET_RECAPTCHA_KEY as string,
                response: token
            })
        });

        const data: RecaptchaResponse = await response.json();
        return data.success;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
    }
}

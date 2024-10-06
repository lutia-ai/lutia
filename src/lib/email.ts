import { env } from '$env/dynamic/private';
import Mailjet from 'node-mailjet';


export async function sendEmail(
    from: string,
	to: string,
	subject: string,
	body: string
): Promise<void> {
    const mailjet = new Mailjet({
        apiKey: env.MAILJET_API_KEY,
        apiSecret: env.MAILJET_SECRET_KEY
    });
    
	const request = mailjet.post('send', { version: 'v3.1' }).request({
		Messages: [
			{
				From: {
					Email: from
				},
				To: [
					{
						Email: to
					}
				],
				Subject: subject,
				HTMLPart: body
			}
		]
	});

	request
		.then((result: any) => {})
		.catch((err: any) => {
			console.error(err.statusCode);
		});
}

export const verifyEmailBody = (emailToken: number) => {
	return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f7;
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    }
                    .logo {
                        margin-bottom: 20px;
                    }
                    .verification-code {
                        font-size: 24px;
                        letter-spacing: 10px;
                        margin: 20px 0;
                    }
                    .button {
                        display: inline-block;
                        margin: 20px 0;
                        padding: 10px 20px;
                        font-size: 16px;
                        background-color: #007bff;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 5px;
                    }
                    .instructions {
                        font-size: 16px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <img src="https://ivory-innovative-prawn-119.mypinata.cloud/ipfs/QmaWbRvrsyYA2ACH3QKbmNBspuSQyo6LnRNTbpsPRQEfFR" alt="Your Company Logo" width="200">
                    <p class="instructions">
                        Welcome to Lutia! Please find your verification code below to
                        complete your registration.
                    </p>
                    <div class="verification-code">
                        ${emailToken}
                    </div>
                </div>
            </body>
        </html>  
    `;
};

export const emailBody = (resetLink: string) => {
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: black;
        }
    
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
    
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
    
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            text-decoration: none;
            color: white;
            border-radius: 5px;
        }
        </style>
    </head>
    <body>
        <div class="container">
        <div class="logo">
            <img src="https://ivory-innovative-prawn-119.mypinata.cloud/ipfs/QmaWbRvrsyYA2ACH3QKbmNBspuSQyo6LnRNTbpsPRQEfFR" alt="Your Company Logo" width="200">
        </div>
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
        <p>To reset your password, please follow these steps:</p>
        <ol>
            <li>Click on the button below to go to the password reset page.</li>
            <li>Enter a new password of your choice.</li>
            <li>Confirm your new password.</li>
        </ol>
        <p style="text-align: center;">
            <a href="${resetLink}" style="color: white" class="button">Reset Your Password</a>
        </p>
        <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you need any assistance, please contact our support team.</p>
        <p>Best regards, <br>Your Company Team </p>
        </div>
    </body>
    </html>
`;
};

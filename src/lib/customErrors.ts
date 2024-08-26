// Custom error classes
export class UserNotFoundError extends Error {
	constructor(email: string) {
		super(`User with email ${email} not found`);
		this.name = 'UserNotFoundError';
	}
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public originalError: Error
	) {
		super(message);
		this.name = 'DatabaseError';
	}
}

export class UnknownError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnknownError';
	}
}

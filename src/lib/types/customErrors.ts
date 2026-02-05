// Custom error classes
export class UserNotFoundError extends Error {
	constructor(uniqueIdentifier: string | number) {
		super(`User: ${uniqueIdentifier} not found`);
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

export class InsufficientBalanceError extends Error {
	constructor() {
		super(`Insufficient balance`);
		this.name = 'InsufficientBalanceError';
	}
}

export class AuthorizationError extends Error {
	public statusCode: number;

	constructor(message: string, statusCode: number = 403) {
		super(message);
		this.name = 'AuthorizationError';
		this.statusCode = statusCode;
	}
}

export class ResourceNotFoundError extends Error {
	public statusCode: number;

	constructor(resource: string) {
		super(`${resource} not found`);
		this.name = 'ResourceNotFoundError';
		this.statusCode = 404;
	}
}

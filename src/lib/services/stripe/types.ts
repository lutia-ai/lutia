/**
 * Stripe Payment Types
 * Types related to Stripe payments and billing
 */

export type CardDetails = {
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
};

export type ChargeResult = {
	success: boolean;
	chargeId?: string;
	error?: string;
};

export type TransactionRecord = {
	id: string;
	amount: number;
	date: Date;
	description: string;
	status: string;
};

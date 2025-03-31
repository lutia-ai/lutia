import type { CardDetails, ChargeResult, TransactionRecord } from '$lib/types';
import stripe from '$lib/stripe/stripe.config';
import type Stripe from 'stripe';

export async function getStripeCardDetails(customerId: string): Promise<CardDetails | null> {
	try {
		// Retrieve the customer's payment methods
		const paymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			type: 'card'
		});

		// Check if the customer has any saved cards
		if (paymentMethods.data.length > 0) {
			const card = paymentMethods.data[0].card;

			if (card) {
				return {
					brand: card.brand,
					last4: card.last4,
					expMonth: card.exp_month,
					expYear: card.exp_year
				};
			}
		}

		// If no saved cards are found, return null
		return null;
	} catch (error) {
		console.error('Error retrieving Stripe card details:', error);
		throw error;
	}
}

export async function saveUserCardDetails(
	customerId: string,
	tokenId: string
): Promise<CardDetails> {
	try {
		// Attach the payment method to the customer
		const paymentMethod = await stripe.paymentMethods.create({
			type: 'card',
			card: { token: tokenId }
		});

		await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId });

		// Set this payment method as the default for the customer
		await stripe.customers.update(customerId, {
			invoice_settings: { default_payment_method: paymentMethod.id }
		});

		// Return the card details
		if (paymentMethod.card) {
			return {
				brand: paymentMethod.card.brand,
				last4: paymentMethod.card.last4,
				expMonth: paymentMethod.card.exp_month,
				expYear: paymentMethod.card.exp_year
			};
		} else {
			throw new Error('Card details not found in payment method');
		}
	} catch (error) {
		console.error('Error saving Stripe card details:', error);
		throw error;
	}
}

export async function deleteUserCardDetails(customerId: string): Promise<void> {
	try {
		// Retrieve all payment methods for the customer
		const paymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			type: 'card'
		});

		if (paymentMethods.data.length === 0) {
			console.error(`No payment methods found for customer ${customerId}.`);
			return;
		}

		// Since they're guaranteed to have only one, we can take the first one
		const paymentMethodId = paymentMethods.data[0].id;

		// Detach the payment method
		await stripe.paymentMethods.detach(paymentMethodId);

		console.log(`Payment method ${paymentMethodId} detached from customer ${customerId}.`);
	} catch (error) {
		console.error('Error detaching Stripe payment method:', error);
		throw error;
	}
}

export async function chargeUserCard(
	customerId: string,
	amount: number,
	currency: string = 'usd',
	description?: string
): Promise<ChargeResult> {
	// Retrieve the customer's default payment method
	const customerResponse = await stripe.customers.retrieve(customerId);

	if (customerResponse.deleted) {
		throw new Error('Customer has been deleted');
	}

	const customer = customerResponse as Stripe.Customer;
	const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;

	if (!defaultPaymentMethodId) {
		throw new Error('No default payment method found for the customer');
	}

	// Create a PaymentIntent
	const paymentIntent = await stripe.paymentIntents.create({
		amount: Math.round(amount * 100), // Convert to cents
		currency: currency,
		customer: customerId,
		payment_method: defaultPaymentMethodId as string,
		off_session: true,
		confirm: true,
		description: description
	});

	if (paymentIntent.status !== 'succeeded') {
		throw new Error(`Payment failed with status: ${paymentIntent.status}`);
	}

	return {
		success: true,
		chargeId: paymentIntent.id
	};
}

export async function getUserTransactionHistory(customerId: string): Promise<TransactionRecord[]> {
	try {
		// Get payment intent history for the customer
		const paymentIntents = await stripe.paymentIntents.list({
			customer: customerId,
			limit: 20 // Limit to the most recent 20 transactions
		});

		// Transform payment intents into TransactionRecord format
		const transactions: TransactionRecord[] = paymentIntents.data
			.filter((intent) => intent.status === 'succeeded') // Only include successful payments
			.map((intent) => ({
				id: intent.id,
				amount: intent.amount / 100, // Convert from cents to dollars
				date: new Date(intent.created * 1000), // Convert from Unix timestamp to Date
				description: intent.description || 'Balance top-up',
				status: intent.status
			}));

		return transactions;
	} catch (error) {
		console.error('Error retrieving transaction history:', error);
		throw error;
	}
}

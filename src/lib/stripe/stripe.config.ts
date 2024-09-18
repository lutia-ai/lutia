import Stripe from 'stripe';
const stripeSecretKey =
	process.env.SECRET_STRIPE_API_KEY || import.meta.env.SECRET_STRIPE_API_KEY;

const stripe = new Stripe(stripeSecretKey);
export default stripe;

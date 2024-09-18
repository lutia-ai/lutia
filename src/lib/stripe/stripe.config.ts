import Stripe from 'stripe';
import { SECRET_STRIPE_API_KEY } from '$env/static/private';

const stripe = new Stripe(SECRET_STRIPE_API_KEY);
export default stripe;

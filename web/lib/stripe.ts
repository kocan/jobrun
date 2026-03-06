import Stripe from 'stripe';

// Platform Stripe client (for creating connected checkout sessions)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover',
});

// Platform fee percentage (e.g., 2.5% = 0.025)
export const PLATFORM_FEE_PERCENT = 0.025;

export function calculateApplicationFee(amount: number): number {
  // Amount is in cents
  return Math.round(amount * PLATFORM_FEE_PERCENT);
}

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

import Stripe from 'stripe';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STRIPE_ACCOUNTS_FILE = path.join(DATA_DIR, 'stripe-accounts.json');

export interface StripeAccountRecord {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getPlatformFeePercent(): number {
  const feePercent = process.env.STRIPE_PLATFORM_FEE_PERCENT;
  return feePercent ? parseFloat(feePercent) : 2.9;
}

export async function readStripeAccounts(): Promise<Record<string, StripeAccountRecord>> {
  try {
    const data = await fs.readFile(STRIPE_ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function writeStripeAccounts(accounts: Record<string, StripeAccountRecord>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STRIPE_ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

export async function saveStripeAccount(userId: string, account: StripeAccountRecord): Promise<void> {
  const accounts = await readStripeAccounts();
  accounts[userId] = account;
  await writeStripeAccounts(accounts);
}

export async function getStripeAccount(userId: string): Promise<StripeAccountRecord | null> {
  const accounts = await readStripeAccounts();
  return accounts[userId] ?? null;
}

export async function deleteStripeAccount(userId: string): Promise<void> {
  const accounts = await readStripeAccounts();
  delete accounts[userId];
  await writeStripeAccounts(accounts);
}

export function calculateApplicationFee(amountCents: number): number {
  const feePercent = getPlatformFeePercent();
  return Math.round(amountCents * (feePercent / 100));
}

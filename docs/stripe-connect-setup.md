# Stripe Connect Setup Guide

This guide walks through configuring Stripe Connect for JobRun so service operators can accept online payments and the platform can collect a fee on each transaction.

---

## Prerequisites

1. **Stripe account** — Sign up at <https://dashboard.stripe.com/register>.
2. **Platform profile** — Complete your Stripe platform profile under **Settings → Connect settings** in the Stripe Dashboard.
3. **Node.js 22+** — Required by the project (see `package.json` engines).
4. **Supabase project** — A running Supabase instance for backend functions and webhook handling.
5. **Stripe CLI** (recommended) — Install from <https://docs.stripe.com/stripe-cli> for local webhook testing.

---

## How Connect Fits Into JobRun

JobRun uses **Stripe Connect with Express accounts**. The flow is:

1. A service operator (pressure washer, auto detailer, etc.) signs up for JobRun.
2. During onboarding the operator connects a Stripe Express account.
3. When a customer pays an invoice, the payment goes through the platform.
4. The platform automatically deducts its fee and transfers the remainder to the operator's connected account.

This model maps to Stripe's **destination charge** flow with an `application_fee_amount`.

---

## Environment Variables

Add these to your `.env` (and `.env.example` for reference). Server-side variables must **never** be exposed to the client.

```bash
# --- Client-side (safe to expose) ---
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # Stripe publishable key

# --- Server-side only (Supabase Edge Functions / Next.js API routes) ---
STRIPE_SECRET_KEY=sk_test_...                    # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook endpoint signing secret
STRIPE_PLATFORM_FEE_PERCENT=10                   # Platform fee percentage (e.g. 10 = 10%)
```

> **Tip:** In test mode all keys start with `pk_test_` / `sk_test_`. Never commit live keys to version control.

---

## Express Account Onboarding

### 1. Create a Connected Account

When an operator starts onboarding, create an Express account on the server:

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const account = await stripe.accounts.create({
  type: "express",
  country: "US",
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: "individual",
  metadata: {
    jobrun_user_id: userId, // your internal user ID
  },
});
```

Store `account.id` (e.g. `acct_...`) in the operator's profile in Supabase.

### 2. Generate an Account Link

Redirect the operator to Stripe's hosted onboarding form:

```ts
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: "https://jobrun.app/connect/refresh",
  return_url: "https://jobrun.app/connect/complete",
  type: "account_onboarding",
});

// Redirect operator to accountLink.url
```

- **`return_url`** — Where Stripe sends the operator after completing (or exiting) onboarding.
- **`refresh_url`** — Where Stripe sends the operator if the link expires; generate a new link here.

### 3. Verify Account Status

After the operator returns, confirm their account is fully onboarded:

```ts
const account = await stripe.accounts.retrieve(connectedAccountId);

const isReady =
  account.charges_enabled && account.payouts_enabled;
```

Only enable payment collection for operators whose accounts have `charges_enabled: true`.

---

## Accepting Payments

When a customer taps **Pay Now** on a shared invoice, create a PaymentIntent with a destination charge:

```ts
const platformFeePercent = parseInt(
  process.env.STRIPE_PLATFORM_FEE_PERCENT || "10",
  10,
);

const paymentIntent = await stripe.paymentIntents.create({
  amount: invoiceTotal, // amount in cents
  currency: "usd",
  application_fee_amount: Math.round(
    invoiceTotal * (platformFeePercent / 100),
  ),
  transfer_data: {
    destination: operatorStripeAccountId, // acct_...
  },
  metadata: {
    invoice_id: invoiceId,
    customer_id: customerId,
  },
});
```

Return `paymentIntent.client_secret` to the client so it can confirm payment using Stripe Elements or the React Native SDK.

---

## Webhooks

Webhooks let the platform react to payment events asynchronously.

### 1. Register the Endpoint

In the Stripe Dashboard go to **Developers → Webhooks → Add endpoint**:

- **URL:** `https://your-supabase-project.supabase.co/functions/v1/stripe-webhook`
- **Events to subscribe to:**
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `account.updated`
  - `account.application.deauthorized`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 2. Verify Signatures

Always verify the webhook signature before processing:

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const event = stripe.webhooks.constructEvent(
  rawBody,
  request.headers.get("stripe-signature"),
  process.env.STRIPE_WEBHOOK_SECRET,
);
```

### 3. Handle Key Events

```ts
switch (event.type) {
  case "payment_intent.succeeded": {
    const pi = event.data.object as Stripe.PaymentIntent;
    // Mark invoice as paid, record Payment with stripePaymentIntentId
    break;
  }
  case "payment_intent.payment_failed": {
    const pi = event.data.object as Stripe.PaymentIntent;
    // Notify operator of failed payment
    break;
  }
  case "account.updated": {
    const account = event.data.object as Stripe.Account;
    // Update charges_enabled / payouts_enabled in your database
    break;
  }
  case "account.application.deauthorized": {
    // Operator disconnected — disable their payment collection
    break;
  }
}
```

---

## Testing in Test Mode

Stripe test mode lets you simulate the full flow without moving real money.

### Test Cards

| Scenario          | Card Number          |
| ----------------- | -------------------- |
| Successful charge | `4242 4242 4242 4242` |
| Declined          | `4000 0000 0000 0002` |
| Requires auth     | `4000 0025 0000 3155` |
| Insufficient funds| `4000 0000 0000 9995` |

Use any future expiry date and any 3-digit CVC.

### Local Webhook Testing with Stripe CLI

```bash
# Forward events to your local dev server
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

The CLI prints a temporary webhook signing secret (`whsec_...`) — use it as `STRIPE_WEBHOOK_SECRET` during development.

### Express Account Test Onboarding

In test mode Stripe pre-fills onboarding forms. Use these test values:

- **SSN last 4:** `0000`
- **Phone verification:** auto-confirmed
- **Bank routing:** `110000000`, **Account:** `000123456789`

---

## Going Live Checklist

Complete each item before enabling live payments:

- [ ] **Activate your Stripe account** — Submit your platform profile and business details for Stripe review.
- [ ] **Switch API keys** — Replace `pk_test_` / `sk_test_` keys with `pk_live_` / `sk_live_` keys in production environment variables.
- [ ] **Update webhook endpoint** — Register a live webhook endpoint and update `STRIPE_WEBHOOK_SECRET`.
- [ ] **Set the platform fee** — Confirm `STRIPE_PLATFORM_FEE_PERCENT` is set to the desired production value.
- [ ] **Verify CSP headers** — Ensure `js.stripe.com` and `api.stripe.com` are allowed in `Content-Security-Policy` (see `web/next.config.ts`).
- [ ] **Enable HTTPS** — All payment pages and webhook endpoints must be served over TLS.
- [ ] **Test a live transaction** — Process a small real payment end-to-end, then refund it.
- [ ] **Enable payout schedule** — Confirm connected accounts have payouts enabled and the schedule suits your operators.
- [ ] **Add dispute handling** — Set up email notifications for disputes in the Stripe Dashboard.
- [ ] **Review Stripe's launch checklist** — <https://docs.stripe.com/connect/launch-checklist>

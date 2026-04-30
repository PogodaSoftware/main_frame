# Third-Party Service Pricing Research — Beauty Booking App

Last researched: 2026-04-28. All prices verified against official vendor docs/pricing pages on this date. Prices may change without notice — re-check before procurement.

---

## Summary Table

| Service | Free tier | Cheapest paid tier | How to cap spend | Status (2026-04-28) |
|---|---|---|---|---|
| **Stripe** (cards, US) | Test mode unlimited (no real money); 25 ops/sec sandbox | 2.9% + $0.30 per successful charge | Use test mode in dev; restricted/restricted-key API keys; archive endpoints | Verified |
| **Google Maps Platform** | 10,000 free calls/month per SKU (Essentials) | Pay-as-you-go per SKU after free quota; Maps JS $7/1k, Geocoding/Places Details $5/1k, Autocomplete $2.83/1k | Cloud Console quotas (per-day), restrict API keys by HTTP referrer/IP, disable billing | Verified (post-Mar 2025 pricing model) |
| **Twilio SMS** (US) | Free trial credit (small preloaded balance, ~$15 historically; not officially published 2026) | $0.0083/segment + carrier fee ($0.0025–$0.005) | Usage Triggers (notify only — not hard cap); set low project budget alert | Verified |
| **SendGrid (Twilio)** | Free trial: 100 emails/day for 60 days only (free plan retired 2025) | Essentials from $19.95/mo (50k emails) | Subuser sending limits; rotate API keys with scoped permissions | Verified |
| **Resend** | 3,000 emails/month free (3,000/mo, 100/day) | Pro $20/mo for 50,000 emails | Per-domain key scoping; pause domain | Verified |
| **AWS SES** | 3,000 message charges/month free for first 12 months (new accounts) | $0.10 per 1,000 outbound emails + $0.12/GB attachments | Sandbox = 200 emails/day cap by default; CloudWatch billing alarm; SES sending pause | Verified |

**Recommendation for dev:** **Resend** for email (truly free 3k/mo, easy webhook signing) and **Twilio** for SMS (industry standard despite no hard cap; pair with strict Usage Triggers + low Twilio account funding).

---

## 1. Stripe — Payment Processing + Webhooks

### Pricing
- **Online card, US domestic:** 2.9% + $0.30 per successful charge.
- **Manually entered card:** +0.5%.
- **International card:** +1.5%.
- **Currency conversion:** +1%.
- **Test mode:** No charges; no per-transaction fee. Rate limit 25 ops/sec (vs. 100 ops/sec in live mode). Some endpoints capped at 25 read/write per second.
- Source: https://stripe.com/pricing — checked 2026-04-28.
- Source: https://docs.stripe.com/rate-limits — checked 2026-04-28.

### Time-Slot Hold Pattern (PaymentIntent manual capture)
Use `capture_method: 'manual'` on PaymentIntent creation. Stripe authorizes the card without debiting; capture later when the service starts.

| Card brand | Hold window (card-not-present) |
|---|---|
| Visa | 5 days (MIT) / 7 days (CIT) |
| Mastercard, Amex, Discover | 7 days |
| Klarna / PayPal / Afterpay | 28 / 10–20 / 13 days |

API params:
- `capture_method=manual` on the PaymentIntent
- For Checkout sessions: `payment_intent_data[capture_method]=manual`
- For per-method card-only: `payment_method_options[card][capture_method]=manual`
- Source: https://docs.stripe.com/payments/place-a-hold-on-a-payment-method — checked 2026-04-28.

### Webhooks — Events the Booking App Needs

| Event | Use in booking flow |
|---|---|
| `payment_intent.amount_capturable_updated` | Authorization succeeded — slot is HELD. Mark booking as reserved. |
| `payment_intent.succeeded` | Capture completed — service paid, finalize booking. |
| `payment_intent.payment_failed` | Auth failed — release slot. |
| `payment_intent.canceled` | Manual cancel — release slot. |
| `charge.refunded` | Full or partial refund — update booking record. |
| `charge.dispute.created` | Chargeback — flag the booking, notify ops. |
| `checkout.session.completed` | (If using Checkout) — booking submitted. |

Webhook signing: HMAC-SHA256 on `timestamp.payload` using endpoint secret; verify `Stripe-Signature` with constant-time compare. Use the official Stripe SDK's `Webhook.constructEvent` helper. Default tolerance 5 minutes. Also recommend IP allowlisting Stripe's published webhook IPs.
- Source: https://docs.stripe.com/webhooks — checked 2026-04-28.
- Event reference: https://docs.stripe.com/api/events/types — checked 2026-04-28.

### Lock Down / Pause in Dev
- Keep dev on **test mode** API keys (`sk_test_*`, `pk_test_*`) — no money flows.
- Use **restricted API keys** with the minimum scope (e.g., write payment_intents, read events) instead of secret keys.
- In the dashboard: **Developers → Webhooks → Disable endpoint** to pause webhook delivery without deleting config.
- To stop a Stripe account entirely: **Settings → Account → Close account** (irreversible). Soft alternative: set all live API keys to roll/disable, archive products/prices, and disable webhooks.

---

## 2. Google Maps Platform

### Free Tier (post-March 2025 model — no more $200 credit)
The flat $200 monthly credit was retired on **2025-03-01**. Replaced by **per-SKU free monthly call quotas** on the pay-as-you-go Essentials tier.
- Source: https://mapsplatform.google.com/pricing/ — checked 2026-04-28.

| SKU | Free monthly calls (Essentials) | Next tier price |
|---|---|---|
| Maps JavaScript API (Dynamic Maps) | 10,000 | $7.00 / 1,000 calls (10,001–100,000) |
| Places — Autocomplete | 10,000 | $2.83 / 1,000 |
| Places — Place Details Essentials | 10,000 | $5.00 / 1,000 |
| Geocoding API | 10,000 | $5.00 / 1,000 |

Subscription bundles (alternative to PAYG):
- Starter $100/mo (50k calls), Essentials $275/mo (100k), Pro $1,200/mo (250k).
- Source: https://developers.google.com/maps/billing-and-pricing/pricing — checked 2026-04-28.

### Quota Caps (hard-stop billing)
**Cloud Console → APIs & Services → [API] → Quotas tab**
1. Filter to the quota (e.g., "Map loads per day").
2. Select → **EDIT QUOTAS** → enter day/minute/per-user-minute cap → submit.
3. Add buffer; enforcement has small latency.
- Source: https://docs.cloud.google.com/apis/docs/capping-api-usage — checked 2026-04-28.

### API Key Restrictions (anti-scraper)
**Credentials → [key] → Application restrictions:**
- **Websites:** add `example.com/*` AND `*.example.com/*` (wildcards only at subdomain or path, not mid-URL).
- **IP addresses:** IPv4, IPv6, or CIDR (`198.51.100.0/24`). Internal IPs and localhost not supported.
- **Android / iOS:** package + SHA-1, or bundle IDs.
- Only ONE application restriction type at a time per key — split into separate keys per platform.
- Always pair with **API restrictions** (limit which APIs the key can call).
- Source: https://docs.cloud.google.com/docs/authentication/api-keys — checked 2026-04-28.

### Pause / Cap in Dev
- **Set per-day quota to a small number** (e.g., 200) in the Quotas tab — hard cap.
- **Disable the API key** in Credentials (toggle off) — instant kill switch.
- **Remove the billing account** from the project — disables paid SKUs (free quota still works for non-billable APIs, but Maps requires billing enabled).
- **Quota=0 trick:** edit quota to 0 to fully stop API calls without revoking key.

---

## 3. Email + SMS Providers

### 3a. Twilio SMS (US)

| Item | Value |
|---|---|
| Trial credit | Small preloaded balance (Twilio doesn't publish exact figure on public docs in 2026; historically ~$15). No credit card needed to sign up. |
| US outbound SMS base | $0.0083 per segment (long codes, toll-free, short codes) |
| Carrier fee (added on top) | $0.0025 – $0.005 per segment |
| Effective cost per US SMS | ~$0.0108 – $0.0133 |

- Source: https://www.twilio.com/en-us/sms/pricing/us — checked 2026-04-28.
- Source: https://help.twilio.com/articles/223136107 — checked 2026-04-28.

**Cap spending:** Twilio **Usage Triggers** are notification webhooks only — they do **not** automatically halt service. Build your own "if trigger fires → suspend Messaging Service" handler, OR keep the account funded with only the small dev balance (when balance hits zero, sends fail). Set Triggers per usage category (sms, calls) by count or price, recurring daily/monthly.
- Source: https://www.twilio.com/docs/usage/api/usage-trigger — checked 2026-04-28.

**Webhooks:** signed with `X-Twilio-Signature` header (HMAC-SHA1 of full URL + sorted POST params, with auth token). Use SDK `RequestValidator`. Status callback events: `queued`, `sent`, `delivered`, `failed`, `undelivered`.

### 3b. SendGrid (Twilio SendGrid)
- **Free plan retired 2025-05-27.** New accounts get a 60-day trial: 100 emails/day, 1 event webhook.
- **Essentials:** from **$19.95/month** (50k–100k emails depending on sub-tier).
- **Pro:** from **$89.95/month** (100k–2.5M emails, dedicated IPs, 5 event webhooks).
- Overage: $0.0005–$0.0013 per email.
- Source: https://www.twilio.com/en-us/changelog/sendgrid-free-plan — checked 2026-04-28.
- Source: https://www.twilio.com/en-us/sendgrid (pricing) — checked 2026-04-28.

**Webhooks (Event Webhook):** events `processed`, `delivered`, `open`, `click`, `bounce`, `dropped`, `deferred`, `spamreport`, `unsubscribe`. Signed with ECDSA — verify with `Verify` helper using your verification key.

### 3c. Resend
- **Free:** 3,000 emails/month, 100/day. 1 domain, webhooks included.
- **Pro:** $20/month, 50,000 emails.
- Webhooks: Svix-signed (HMAC), events `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, `email.delivery_delayed`.
- Source: https://resend.com/pricing — checked 2026-04-28.

### 3d. AWS SES
- **Outbound:** $0.10 per 1,000 emails + $0.12 per GB attachment data.
- **Inbound:** $0.10 per 1,000 + $0.09 per 1,000 incoming chunks.
- **Free tier:** 3,000 message charges/month for the first 12 months (new AWS accounts).
- Source: https://aws.amazon.com/ses/pricing/ — checked 2026-04-28.

**Sandbox limitations (default for new SES accounts):**
- Send only to **verified** recipient addresses/domains or the SES mailbox simulator.
- **200 messages / 24 hours** maximum.
- **1 message / second** rate limit.
- Suppression list APIs and bulk actions disabled.
- Move out by submitting a production-access request from the SES console; AWS responds in ~24h.
- Source: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html — checked 2026-04-28.

**Cap spending:**
- Stay in sandbox for dev — implicit 200/day hard cap.
- AWS Budgets / CloudWatch alarm on SES `Send` metric, paired with SES `UpdateAccountSendingEnabled false` Lambda for an auto-pause.

### Recommendation

| Need | Pick | Why |
|---|---|---|
| **SMS** | **Twilio** | Best US deliverability; clean SDK; webhook signing well-documented. Mitigate uncapped risk with a low Twilio balance + Usage Trigger that hits an automated `MessagingService.update({...inboundRequestUrl:null})` to disable. |
| **Email** | **Resend** | Truly free 3k/mo (vs. SendGrid's expired free plan); modern API; Svix-signed webhooks out of the box; cheapest paid step ($20/50k) matches SendGrid Essentials. SES is cheaper at scale ($5 per 50k) but sandbox + verification friction is heavy for early dev. |

---

## Cross-Cutting Dev Hygiene Checklist

1. **Separate prod and dev keys.** Never put live Stripe `sk_live_*` or production Maps keys in `.env.development`.
2. **Restrict every key.** Maps key → referrer/IP. Stripe → restricted key with scoped perms. SendGrid/Resend → scoped API key per service.
3. **Set hard caps.** Maps quota=low. AWS Budgets alarm. Twilio Usage Trigger pointed at a kill-switch endpoint. SES kept in sandbox.
4. **Webhook signature verification on every endpoint.** Reject any request whose signature doesn't validate.
5. **Rotate keys quarterly** and on any team-member offboard.
6. **Monitor:** add Stripe Sigma / GMP usage report / Twilio usage emails / SES CloudWatch to a weekly review.

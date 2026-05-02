# Stripe Integration Guide — Beauty Booking App

Last updated: 2026-05-02

This document covers the full plan for integrating Stripe into the beauty booking
marketplace, including architecture decisions, file locations, Docker configuration,
environment variable setup, and implementation steps. No secrets or API keys are
stored here — see the Environment Variables section for how to manage credentials safely.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current State of the Codebase](#current-state-of-the-codebase)
3. [Environment Variables](#environment-variables)
4. [Docker Configuration](#docker-configuration)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Integration](#frontend-integration)
7. [Payment Flow](#payment-flow)
8. [Webhook Strategy](#webhook-strategy)
9. [Implementation Checklist](#implementation-checklist)
10. [Testing Locally](#testing-locally)
11. [Security Rules](#security-rules)
12. [Going to Production](#going-to-production)

---

## Architecture Overview

The project is a containerised Django + Angular stack:

```
docker-compose.yml
  ├── db          (postgres:16)              — unchanged for Stripe
  ├── backend     (python:3.12-slim / Django) — Stripe SDK lives here
  └── frontend    (node:22 → nginx / Angular) — Stripe.js + Elements live here
```

The Django backend is the only service that ever touches a Stripe secret key.
The Angular frontend only uses the publishable key (safe to expose in browser code).

Stripe data flows:

```
Customer browser
  │  (Stripe.js / Payment Element)
  ▼
Angular Frontend  ──► Django BFF / beauty_api  ──► Stripe API
                                │
                                ▼
                          PostgreSQL (BeautyBooking model)
                                │
                  ◄─────────────┘
             Stripe Webhook (async)
```

---

## Current State of the Codebase

These pieces are already in place and will connect to Stripe:

| File / Location | What exists today |
|---|---|
| `Backend/controller/beauty_api/booking_views.py` | `TODO: trigger Stripe refund` comments in cancellation handlers — the hook points are ready |
| `Backend/controller/beauty_api/business_views.py` | Same `TODO: trigger Stripe refund` comments in business-side cancellation |
| `Backend/controller/beauty_api/models.py` — `BeautyBooking` | Stores `price_cents` and `service_price_cents_at_booking` — Stripe IDs not yet added |
| `Frontend/.../beauty/store/webhooks.actions.ts` | NgRx actions for Stripe events already defined (`webhookEventReceived`, `webhookStreamConnected`, etc.) |
| `Frontend/.../beauty/store/webhooks.effects.ts` | Stub effect class exists; SSE wiring is the TODO |
| `Frontend/.../beauty/store/webhooks.reducer.ts` | Fully implemented — deduplicates up to 50 webhook events by ID |
| `docs/third-party-costs-research.md` | Stripe pricing, hold window tables, and webhook event list already researched |

---

## Environment Variables

**Never commit secrets to source control or hardcode them in any file.**

The following variables must be set as environment secrets (in Replit's Secrets tab,
or your `.env` file which is git-ignored):

| Variable | Description | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server-side secret key. Starts with `sk_test_` (dev) or `sk_live_` (prod). | Stripe Dashboard → Developers → API Keys |
| `STRIPE_PUBLISHABLE_KEY` | Client-side publishable key. Starts with `pk_test_` or `pk_live_`. | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Signs incoming webhook payloads for verification. Starts with `whsec_`. | Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret |

**Key rules:**
- Always use `sk_test_*` and `pk_test_*` keys in development — no real money moves
- Never use `sk_live_*` on a local or development machine
- Use Stripe restricted API keys with minimum required scopes instead of full secret keys where possible
- Rotate all keys quarterly and on any team-member offboard

---

## Docker Configuration

Add the three Stripe environment variables to the `backend` service in `docker-compose.yml`.
Read them from host environment variables (never hardcode values in the file):

```yaml
# docker-compose.yml — backend service environment block (add these lines)
services:
  backend:
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```

The `db` and `frontend` services require no changes.

### Webhooks in local Docker development

Stripe cannot reach `localhost` or a Docker-internal host directly. During local
development, use the Stripe CLI to forward webhook events to your running backend:

```bash
# Install Stripe CLI (https://stripe.com/docs/stripe-cli)
# Then forward to your local backend:
stripe listen --forward-to localhost:8000/api/stripe/webhook/
```

The CLI prints a temporary webhook signing secret (`whsec_...`) for that session.
Set `STRIPE_WEBHOOK_SECRET` to that value while running locally.

In production (deployed with a public domain), register your actual domain URL
as the webhook endpoint in the Stripe Dashboard instead.

---

## Backend Implementation

### 1. Add the Stripe Python SDK

Add to `Backend/controller/requirements.txt`:

```
stripe==12.x.x   # pin to latest stable — check https://github.com/stripe/stripe-python/releases
```

The Docker image rebuilds automatically on the next `docker compose up --build`.

### 2. Add Stripe fields to the BeautyBooking model

In `Backend/controller/beauty_api/models.py`, add to `BeautyBooking`:

```python
stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
stripe_customer_id       = models.CharField(max_length=255, blank=True, null=True)
stripe_charge_id         = models.CharField(max_length=255, blank=True, null=True)
payment_status           = models.CharField(max_length=50, default='pending')
# payment_status values: pending | authorized | captured | refunded | failed | disputed
```

Then create and apply the migration:

```bash
python manage.py makemigrations beauty_api
python manage.py migrate
```

### 3. Create a Stripe client helper

Create `Backend/controller/beauty_api/stripe_client.py`:

```python
import stripe
import os

def get_stripe_client() -> stripe.Stripe:
    secret_key = os.environ.get('STRIPE_SECRET_KEY')
    if not secret_key:
        raise EnvironmentError('STRIPE_SECRET_KEY is not set')
    stripe.api_key = secret_key
    return stripe
```

### 4. Create the payment intent endpoint

In `Backend/controller/beauty_api/booking_views.py`, add a view that creates a
PaymentIntent using `capture_method='manual'` (authorize now, capture after service):

```python
# Pseudocode — add real view class/function to match project conventions
def create_payment_intent(request):
    booking = get_booking_for_user(request)
    stripe_client = get_stripe_client()

    intent = stripe_client.PaymentIntent.create(
        amount=booking.price_cents,
        currency='usd',
        capture_method='manual',       # hold the card; capture after service
        metadata={'booking_id': str(booking.id)},
    )

    booking.stripe_payment_intent_id = intent.id
    booking.payment_status = 'pending'
    booking.save()

    # Return only the client_secret to the frontend — never the full intent object
    return JsonResponse({'client_secret': intent.client_secret})
```

### 5. Create the webhook handler

Add `Backend/controller/beauty_api/webhook_views.py`:

```python
import stripe
import os
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseBadRequest

HANDLED_EVENTS = {
    'payment_intent.amount_capturable_updated',  # auth succeeded — slot held
    'payment_intent.succeeded',                  # capture complete — service paid
    'payment_intent.payment_failed',             # auth failed — release slot
    'payment_intent.canceled',                   # canceled — release slot
    'charge.refunded',                           # refund complete
    'charge.dispute.created',                    # chargeback — flag booking
}

@csrf_exempt
def stripe_webhook(request):
    payload   = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponseBadRequest('Invalid payload or signature')

    if event['type'] not in HANDLED_EVENTS:
        return JsonResponse({'received': True})   # ignore irrelevant events

    # Dispatch to handler functions
    handle_stripe_event(event)
    return JsonResponse({'received': True})
```

**Critical:** register this route BEFORE any middleware that reads the request body,
and use the raw body (not parsed JSON) for signature verification.

```python
# Backend/controller/main_frame_project/urls.py
from beauty_api.webhook_views import stripe_webhook

urlpatterns = [
    path('api/stripe/webhook/', stripe_webhook),   # must come first
    # ... rest of urls
]
```

### 6. Fill in the existing refund TODOs

In `booking_views.py` and `business_views.py`, replace the `TODO: trigger Stripe refund`
comments with:

```python
stripe_client = get_stripe_client()
stripe_client.Refund.create(
    payment_intent=booking.stripe_payment_intent_id,
    # omit 'amount' for full refund; add amount=cents for partial
)
booking.payment_status = 'refunded'
booking.save()
```

### 7. Create the SSE stream endpoint for the frontend

To feed the Angular NgRx webhook store in real time, add a streaming endpoint
at `GET /api/beauty/events/stream/` that relays Stripe events via Server-Sent Events.
The webhook handler writes incoming events to an in-memory queue or database table;
the SSE endpoint reads from that queue and streams to connected clients.

This is the final wiring point that `webhooks.effects.ts` is waiting for (see Frontend
section below).

---

## Frontend Integration

### Stripe.js (one-time setup)

Add the Stripe.js script to `Frontend/portfolioResume/src/index.html`:

```html
<script src="https://js.stripe.com/v3/" async></script>
```

Or install the Angular wrapper:

```bash
npm install @stripe/stripe-js
```

Use the **publishable key** only in frontend code — read it from an environment
variable baked in at build time (`environment.ts`), not from any runtime secret.

### Payment Element

In the booking confirmation component, load Stripe and mount the Payment Element:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(environment.stripePublishableKey);
const elements = stripe.elements({ clientSecret });  // clientSecret from backend
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');
```

### Wire the NgRx webhook effects

`webhooks.effects.ts` has a comment pointing to `GET /api/beauty/events/stream/`.
Once that backend endpoint exists, add an `EventSource` effect:

```typescript
// webhooks.effects.ts — approximate shape
streamConnect$ = createEffect(() =>
  this.actions$.pipe(
    ofType(BookingActions.bookingConfirmed),
    switchMap(() => new Observable(observer => {
      const es = new EventSource('/api/beauty/events/stream/');
      es.onopen    = () => observer.next(webhookStreamConnected());
      es.onmessage = (msg) => observer.next(
        webhookEventReceived({ event: JSON.parse(msg.data) })
      );
      es.onerror   = () => observer.next(
        webhookStreamError({ message: 'SSE connection lost' })
      );
      return () => es.close();
    }))
  )
);
```

The `webhooks.reducer.ts` is already wired to handle all four action types above.

---

## Payment Flow

The beauty booking app uses **manual capture** (authorize-now, capture-later) to
hold the customer's card at booking time and release or capture it at service time.

```
1. Customer selects service and time slot
        │
        ▼
2. Frontend calls backend → backend creates PaymentIntent (capture_method=manual)
   Backend returns client_secret (never the full intent)
        │
        ▼
3. Customer completes Payment Element in browser
   Stripe authorizes card (no charge yet)
        │
        ▼
4. Stripe fires: payment_intent.amount_capturable_updated
   Webhook handler marks booking.payment_status = 'authorized'
   Slot is confirmed/reserved
        │
        ├─── If service completes normally:
        │       Backend calls stripe.PaymentIntent.capture(intent_id)
        │       Stripe fires: payment_intent.succeeded
        │       Webhook marks booking.payment_status = 'captured'
        │
        └─── If booking is cancelled:
                Backend calls stripe.Refund.create(payment_intent=intent_id)
                (replaces the existing TODO comments)
                Stripe fires: charge.refunded
                Webhook marks booking.payment_status = 'refunded'
```

### Hold windows by card brand

| Card brand | Hold window |
|---|---|
| Visa | 5 days (MIT) / 7 days (CIT) |
| Mastercard, Amex, Discover | 7 days |
| Klarna / PayPal / Afterpay | 28 / 10–20 / 13 days |

If a booking is not captured or cancelled before the hold window expires, the
authorization lapses automatically. Build a scheduled task (cron / Celery beat)
to capture or cancel intents before they expire.

---

## Webhook Strategy

### Events to handle

| Stripe event | Action in the booking app |
|---|---|
| `payment_intent.amount_capturable_updated` | Authorization succeeded — mark slot as RESERVED |
| `payment_intent.succeeded` | Capture complete — mark booking as PAID |
| `payment_intent.payment_failed` | Auth failed — release slot, notify customer |
| `payment_intent.canceled` | Intent cancelled — release slot |
| `charge.refunded` | Refund processed — update booking record, notify customer |
| `charge.dispute.created` | Chargeback opened — flag booking, notify ops team |

### Signature verification (non-negotiable)

Every webhook request must be verified using `stripe.Webhook.construct_event()`.
This uses HMAC-SHA256 on `timestamp.payload` with the endpoint's signing secret.
The default tolerance window is 5 minutes. Never skip this check.

### Idempotency

Stripe may deliver the same event more than once. Check whether you have already
processed an event ID before taking action:

```python
if BeautyBooking.objects.filter(last_stripe_event_id=event['id']).exists():
    return JsonResponse({'received': True})   # already handled
```

---

## Implementation Checklist

### Backend
- [ ] Add `stripe` to `requirements.txt`
- [ ] Create `beauty_api/stripe_client.py`
- [ ] Add Stripe fields to `BeautyBooking` model (`stripe_payment_intent_id`, `stripe_customer_id`, `stripe_charge_id`, `payment_status`)
- [ ] Create and apply migration
- [ ] Add `create_payment_intent` view + URL route
- [ ] Add `stripe_webhook` view + URL route (before body-parsing middleware)
- [ ] Implement webhook event dispatch for the 6 key events
- [ ] Replace `TODO: trigger Stripe refund` comments in `booking_views.py` and `business_views.py`
- [ ] Add `GET /api/beauty/events/stream/` SSE endpoint
- [ ] Add scheduled task to expire/capture stale authorized intents

### Frontend
- [ ] Add Stripe.js script or install `@stripe/stripe-js`
- [ ] Set `stripePublishableKey` in `environment.ts` (publishable key only — safe for browser)
- [ ] Build payment step into the booking confirmation component using Payment Element
- [ ] Wire `webhooks.effects.ts` EventSource to `/api/beauty/events/stream/`

### Docker / infrastructure
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` to `docker-compose.yml` backend environment block (read from host env, never hardcoded)
- [ ] Add the three secrets to Replit Secrets (or your CI secret store for production)
- [ ] Register webhook endpoint URL in Stripe Dashboard

---

## Testing Locally

1. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` to **test mode** keys (`sk_test_*`, `pk_test_*`)
2. Start the backend: `docker compose up backend`
3. In a separate terminal, run the Stripe CLI forwarder:
   ```bash
   stripe listen --forward-to localhost:8000/api/stripe/webhook/
   ```
4. Copy the `whsec_...` secret the CLI prints and set it as `STRIPE_WEBHOOK_SECRET`
5. Use Stripe test card numbers to simulate payments:
   - `4242 4242 4242 4242` — always succeeds
   - `4000 0000 0000 9995` — always declines (insufficient funds)
   - `4000 0025 0000 3155` — requires 3D Secure authentication
6. Trigger test webhook events manually via the Stripe CLI:
   ```bash
   stripe trigger payment_intent.succeeded
   stripe trigger charge.refunded
   ```

Full test card list: https://docs.stripe.com/testing

---

## Security Rules

1. **Secret key stays on the server.** `STRIPE_SECRET_KEY` must never appear in frontend code, Angular environments, nginx config, or any file committed to git.
2. **Publishable key is the only key the browser sees.** It is safe to include in `environment.ts` or `environment.prod.ts`.
3. **Verify every webhook.** Use `stripe.Webhook.construct_event()` — reject any request that fails signature verification.
4. **Use test mode keys in development.** Never put `sk_live_*` on a local machine.
5. **Restrict your Stripe keys.** In the Stripe Dashboard, create restricted keys with only the permissions your app actually needs (e.g., write payment_intents, read events). Avoid full secret keys.
6. **Rotate keys quarterly** and immediately if any are accidentally committed or exposed.
7. **Do not log the full PaymentIntent object.** It can contain card metadata. Log only IDs.
8. **IP allowlisting (optional but recommended).** Stripe publishes its webhook IP ranges — you can allowlist them at the nginx or firewall level.

---

## Going to Production

1. Create a separate set of **live mode** Stripe API keys (`sk_live_*`, `pk_live_*`)
2. Register a new webhook endpoint in the Stripe Dashboard pointing at your production URL: `https://yourdomain.com/api/stripe/webhook/`
3. Copy the new `whsec_...` signing secret and set it as `STRIPE_WEBHOOK_SECRET` in your production environment secrets
4. Update `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` to live mode values in your production secrets
5. Run `python manage.py migrate` in production to apply the BeautyBooking model changes
6. Monitor the Stripe Dashboard for failed webhook deliveries during the first 24 hours

Stripe automatically retries failed webhook deliveries for up to 3 days with exponential backoff.

---

## References

- Stripe API docs: https://docs.stripe.com/api
- PaymentIntent manual capture: https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
- Webhook verification: https://docs.stripe.com/webhooks/signature
- Stripe CLI: https://docs.stripe.com/stripe-cli
- Test cards: https://docs.stripe.com/testing
- Stripe Python SDK: https://github.com/stripe/stripe-python
- Pricing (verified 2026-04-28): https://stripe.com/pricing
- Webhook event types: https://docs.stripe.com/api/events/types

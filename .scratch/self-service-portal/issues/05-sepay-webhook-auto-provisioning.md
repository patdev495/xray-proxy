# 05-sepay-webhook-auto-provisioning

Status: ready-for-agent

## Parent

.scratch/self-service-portal/PRD.md

## What to build

SePay Webhook handler, automated subscription provisioning, and Admin manual confirmation fallback.
Endpoint `/api/v1/payments/sepay-webhook`: receives SePay transfer payload, verifies API token, extracts order code (`ORD-XXXX`), matches `Order`.
On match: updates `Order.status = PAID`. Calls allocation engine to pick least-loaded Node in chosen Region. Creates `Subscription` linked to Customer's `user_id`. Pushes user to Node via Xray gRPC.
Frontend checkout modal polls `/api/v1/orders/{code}/status` and transitions to Success state with instant subscription link & QR code.
Admin Orders tab in UI: lists all orders with manual "Confirm Payment" button to unblock mismatched transfer remarks.

## Acceptance criteria

- [ ] SePay webhook validates token and reconciles order code with pending order.
- [ ] Successful reconciliation provisions new subscription and syncs to target node via gRPC.
- [ ] Checkout modal auto-detects paid state and reveals subscription link/QR within seconds.
- [ ] Admin UI provides manual order confirmation button that executes same provisioning path.

## Blocked by

- .scratch/self-service-portal/issues/01-node-capacity-load-balancing.md
- .scratch/self-service-portal/issues/04-landing-store-vietqr-checkout.md

## Comments

> *Generated from architectural decisions in ADR 0010.*

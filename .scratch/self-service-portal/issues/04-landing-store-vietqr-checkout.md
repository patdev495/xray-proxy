# 04-landing-store-vietqr-checkout

Status: done

## Parent

.scratch/self-service-portal/PRD.md

## What to build

Minimalist public landing page with pricing cards, support buttons, and VietQR checkout modal.
Model `Order`: `code` (`ORD-XXXX`), `user_id`, `plan_id`, `region`, `amount_vnd`, `status` (`PENDING`, `PAID`, `CANCELLED`, `EXPIRED`), `expires_at`.
Public home `/`: Clean cards for each active `Plan`, Support buttons for Telegram/Zalo, Login/Register header.
Checkout flow: Customer selects Plan and Region. If Region is full, shows "Sold out" and disables submit. On submit, creates `Order` and renders Checkout Modal with VietQR payment QR, exact transfer content (`ORD-XXXX`), and 15-minute countdown.

## Acceptance criteria

- [x] `Order` DB model and `/api/v1/orders/create` endpoint created.
- [x] Landing page displays available plans and support channel links cleanly.
- [x] Region selector shows "Sold out" when capacity exhausted.
- [x] Checkout modal renders valid VietQR code and transfer content.

## Blocked by

- .scratch/self-service-portal/issues/02-plan-catalog-and-settings.md
- .scratch/self-service-portal/issues/03-auth-google-customer-onboarding.md

## Comments

> *Generated from architectural decisions in ADR 0010.*
> *Completed: Full TDD backend order model and endpoints + LandingStorePage at `/` with capacity-aware region selection + CheckoutModal with VietQR and 15-minute countdown timer.*

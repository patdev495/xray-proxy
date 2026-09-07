# 07-composite-pricing-daily-test-plans

Status: ready-for-agent

## Parent

.scratch/self-service-portal/PRD.md

## What to build

Composite Pricing on Plan model and resource-controlled Daily Test Tier (24h validity, zero grace period, no in-place renewal).
1. Plan Model & Admin UI:
   - Enhance `Plan` model with composite pricing:
     - Monthly cycle (default): `price_monthly_vnd`, `quota_monthly_bytes`, 30 days.
     - Daily cycle (optional): `enable_daily: bool`, `price_daily_vnd: int | None`, `quota_daily_bytes: int | None`, 24 hours.
   - Admin Plan Form updated to single unified form with "Kích hoạt gói ngày dùng thử" switch.
2. Orders & Provisioning:
   - `OrderCreate` and `Order` model accept `billing_cycle: "DAILY" | "MONTHLY"` (default `MONTHLY`).
   - For `DAILY`: amount = `plan.price_daily_vnd`, duration = 24 hours (`now + timedelta(hours=24)`), quota = `plan.quota_daily_bytes`.
   - Prevent multiple pending orders per user (auto-cancel older pending orders or reject).
3. Subscription & Zero Grace Period on Daily Tier:
   - `Subscription` stores `billing_cycle`.
   - Node Capacity count updated: Daily subscriptions release slot immediately upon `expires_at < now` (0 grace period). Monthly subscriptions retain 3-day grace period.
   - Node Sync job immediately revokes gRPC access and clears node slot upon 24h expiration for daily subs.
4. Storefront & Customer Portal UI:
   - Storefront (`/`): Plan cards render cycle switch toggle (`[30 Ngày - 50.000đ]` / `[1 Ngày - 3.000đ]`).
   - Customer Portal (`/portal`):
     - Daily subscription shows `Gói ngày (Dùng thử)` badge.
     - Hides "Gia hạn" button.
     - Shows "Nâng cấp gói tháng" button redirecting to Store.

## Acceptance criteria

- [ ] Plan model and Admin UI allow configuring monthly price/quota and optional daily price/quota in one form.
- [ ] Storefront displays cycle selector toggle on eligible plans and creates order with selected `billing_cycle`.
- [ ] Daily subscriptions expire after exactly 24 hours and have zero grace period (slot freed immediately upon expiry).
- [ ] Node capacity slot calculation respects 0 grace period for daily subs and 3 days for monthly subs.
- [ ] Customer portal hides in-place renewal for daily subscriptions and provides "Nâng cấp gói tháng" upgrade action.

## Blocked by

- .scratch/self-service-portal/issues/06-customer-portal-inplace-renewal.md

## Comments

> *Generated from architectural decisions in ADR 0011.*

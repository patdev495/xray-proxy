# 06-customer-portal-inplace-renewal

Status: done

## Parent

.scratch/self-service-portal/PRD.md

## What to build

Customer Portal dashboard with In-place Renewal, Grace Period enforcement, and Node Switching self-healing.
Customer dashboard `/portal`: "My Subscriptions" showing data usage progress bars (GB used / total quota), expiration countdown, 1-click Shadowrocket/v2rayNG link copy, and QR code modal.
In-place Renewal flow: "Renew" button on subscription creates renewal `Order`. Upon payment, extends `expires_at` by plan duration and resets `traffic_quota_bytes` while keeping existing `uuid` and `token` unchanged.
Node Switching: "Đổi Server" button lets customer migrate subscription to another healthy node with available capacity in same region. Frees old node slot, adds UUID to new node via gRPC, keeps client UUID/token intact.
Grace Period logic: expired subscriptions hold node slot for 3 days before slot release, permitting seamless customer renewal.
Node Sync job updated: respects 3-day grace period for slot calculations while suspending gRPC access when expired or quota exceeded.

## Acceptance criteria

- [x] Customer portal renders active subscriptions with traffic usage bars and quick import actions.
- [x] Renewal order extends expiration and resets quota without altering client UUID or subscription link.
- [x] Node Switching endpoint and UI allows moving subscription to another eligible node in region without breaking client config.
- [x] 3-day grace period keeps node slot reserved after expiration.
- [x] Expired or quota-exceeded subscriptions are disabled on node via gRPC until renewed.

## Blocked by

- .scratch/self-service-portal/issues/05-sepay-webhook-auto-provisioning.md

## Comments

> *Generated from architectural decisions in ADR 0010.*

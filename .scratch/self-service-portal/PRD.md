# Self-Service Proxy Rental Portal & Automated Provisioning

## Overview
Transform `xray-proxy` into self-service commercial portal for VLESS-Reality 4G Data Bypass (SNI zero-rating).
Customers register, pick Plan and Region. System auto-provisions least-loaded VPS Node with Node Capacity checks.
Payments auto-processed via VietQR / SePay webhook. In-place renewal with 3-day grace period keeps UUID intact.

## Goals
- Commercial self-service portal: unified auth (`/login`, `/register`) with role-based routing (`/admin` vs `/portal`) + Google OAuth fallback.
- Admin Plan catalog: custom price, quota GB, days valid, allowed regions.
- Node load balancing: Admin sets `max_subscriptions` per node; customer picks Region; system allocates least-loaded node. Sold out when region capacity hit.
- Seamless In-place renewal: preserves client UUID/token on payment renewal. 3-day grace period protects slot.
- Automated VietQR / SePay billing: 3s provisioning via webhook + Admin manual confirm fallback.
- Minimal landing page: pricing cards, Telegram/Zalo support link, login/register.

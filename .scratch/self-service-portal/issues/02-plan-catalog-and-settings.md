# 02-plan-catalog-and-settings

Status: ready-for-agent

## Parent

.scratch/self-service-portal/PRD.md

## What to build

Plan Catalog management and System Settings storage for Admin.
Create `Plan` model (`id`, `name`, `price_vnd`, `traffic_quota_bytes`, `days_valid`, `allowed_regions` JSON list, `is_active`, `sort_order`).
Create `SystemSetting` model for key-value settings (`support_telegram_url`, `support_zalo_url`, etc.).
CRUD REST API for Admin under `/api/v1/admin/plans` and `/api/v1/admin/settings`.
Public read API for active plans and support links (`/api/v1/public/plans`, `/api/v1/public/settings`).
Admin UI tab "Plans & Settings" to create, edit, toggle active status, and configure support links.

## Acceptance criteria

- [ ] DB models `Plan` and `SystemSetting` created with migrations.
- [ ] Admin CRUD endpoints tested and functional for Plans and Settings.
- [ ] Public endpoint returns active plans and support channels.
- [ ] Admin UI tab allows adding/editing plans and updating Telegram/Zalo URLs.

## Blocked by

- .scratch/self-service-portal/issues/01-node-capacity-load-balancing.md

## Comments

> *Generated from architectural decisions in ADR 0010.*

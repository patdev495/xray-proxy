# 02-plan-catalog-and-settings

Status: done

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

- [x] DB models `Plan` and `SystemSetting` created with migrations.
- [x] Admin CRUD endpoints tested and functional for Plans and Settings.
- [x] Public endpoint returns active plans and support channels.
- [x] Admin UI tab allows adding/editing plans and updating Telegram/Zalo URLs.

## Blocked by

- .scratch/self-service-portal/issues/01-node-capacity-load-balancing.md

## Comments

> *Generated from architectural decisions in ADR 0010.*
> *Completed via TDD: 2 integration tests in `tests/test_plan_and_settings.py`, all 45 backend tests pass, full frontend UI tab with modals and support URLs built.*


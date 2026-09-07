# 03-auth-google-customer-onboarding

Status: done

## Parent

.scratch/self-service-portal/PRD.md

## What to build

Unified login and customer registration with Google OAuth graceful fallback.
Extend `User` model with `email`, `oauth_provider`, `oauth_id`.
Endpoints: `/api/v1/auth/register` (creates user with role `CUSTOMER`), `/api/v1/auth/google` (exchanges Google ID token for JWT session, creates user if absent).
Frontend unified auth: `/login` and `/register` with tab/toggle. Standard username/password fields + "Sign in with Google" button. Google button auto-hides if `VITE_GOOGLE_CLIENT_ID` not configured.
Role-based post-login redirection: `ADMIN` -> `/admin`, `CUSTOMER` -> `/portal`.

## Acceptance criteria

- [x] `User` model supports email and optional OAuth identity fields.
- [x] Customer can register with username/password and receive valid JWT session.
- [x] Google OAuth exchange endpoint functions when configured, frontend hides button gracefully when missing config.
- [x] Post-login redirection sends `ADMIN` to `/admin` and `CUSTOMER` to `/portal`.

## Blocked by

- None - can start immediately

## Comments

> *Generated from architectural decisions in ADR 0010.*

- Completed via TDD across backend and frontend.
- Added `email`, `oauth_provider`, `oauth_id` to `User` model with nullable `hashed_password` for OAuth users.
- Implemented `/api/v1/auth/register` (auto-logs in with CUSTOMER role JWT) and `/api/v1/auth/google` (Google tokeninfo verification + customer auto-provisioning).
- Created Pristine Light unified auth page with Sign In / Register tabs and graceful Google OAuth fallback.
- Added initial `CustomerPortal` shell and implemented role-based redirection (`ADMIN` -> `/admin`, `CUSTOMER` -> `/portal`).
- Full test suite verified: 55 backend tests passing, static typing clean with `mypy`, frontend built cleanly with `tsc -b && vite build`.


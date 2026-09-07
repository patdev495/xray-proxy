# 03-auth-google-customer-onboarding

Status: ready-for-agent

## Parent

.scratch/self-service-portal/PRD.md

## What to build

Unified login and customer registration with Google OAuth graceful fallback.
Extend `User` model with `email`, `oauth_provider`, `oauth_id`.
Endpoints: `/api/v1/auth/register` (creates user with role `CUSTOMER`), `/api/v1/auth/google` (exchanges Google ID token for JWT session, creates user if absent).
Frontend unified auth: `/login` and `/register` with tab/toggle. Standard username/password fields + "Sign in with Google" button. Google button auto-hides if `VITE_GOOGLE_CLIENT_ID` not configured.
Role-based post-login redirection: `ADMIN` -> `/admin`, `CUSTOMER` -> `/portal`.

## Acceptance criteria

- [ ] `User` model supports email and optional OAuth identity fields.
- [ ] Customer can register with username/password and receive valid JWT session.
- [ ] Google OAuth exchange endpoint functions when configured, frontend hides button gracefully when missing config.
- [ ] Post-login redirection sends `ADMIN` to `/admin` and `CUSTOMER` to `/portal`.

## Blocked by

- None - can start immediately

## Comments

> *Generated from architectural decisions in ADR 0010.*

# Frontend bilingual i18n

## Goal

Make the Control Plane frontend available in Vietnamese and English using `i18next` with `react-i18next`. Vietnamese is the default language. A visitor's selection persists in browser `localStorage` and can be changed through a reusable `VI / EN` header control.

## Scope

- Translate static frontend chrome across the public Store, authentication, Customer Portal, and Admin UI.
- Format dates and times with `vi-VN` or `en-US` based on the selected Interface Language; continue to format prices as VND.
- Retain technical identifiers such as IP addresses, ports, protocol names, and values entered by an Admin.
- Retain API error messages in English.

## Out of scope

- Backend localization, API locale negotiation, and API error translation.
- Account-level language preferences.
- Translated Plan, Region, Node, support, or other Admin-authored content.

## Accepted design decisions

- The supported Interface Languages are `vi` and `en`.
- First visit defaults to Vietnamese; a saved browser preference takes precedence.
- The selector uses the labels `VI` and `EN`, not national flags.
- Translation resources use stable namespaced keys rather than inline translated strings.

## Delivery order

1. Shared i18n runtime and public entry point
2. Store and authentication
3. Customer Portal
4. Admin shell and operational overview
5. Admin resource and transaction management

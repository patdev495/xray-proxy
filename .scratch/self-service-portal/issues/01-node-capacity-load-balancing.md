# 01-node-capacity-load-balancing

Status: ready-for-agent

## Parent

.scratch/self-service-portal/PRD.md

## What to build

End-to-end Node Capacity management and Region-based least-loaded allocation engine.
Add `max_subscriptions` (default 100) to Node model. Update Admin UI Node cards to view/edit capacity and active subscriber count.
Backend allocation service: when assigning a Node for a given Region, filter active nodes where `active_subs < max_subscriptions`, pick node with lowest subscriber count. Expose region capacity status API (detect if Region is Sold Out).

## Acceptance criteria

- [ ] `Node` table has `max_subscriptions: int` column with schema migration/default.
- [ ] Admin UI displays Node Capacity and current load on Node cards, allows updating `max_subscriptions`.
- [ ] Backend service `allocate_node_for_region(db, region)` returns least-loaded node or raises `RegionOutOfCapacityError`.
- [ ] Endpoint `/api/v1/regions/status` returns list of regions with availability (`is_sold_out: bool`, `available_slots: int`).

## Blocked by

- None - can start immediately

## Comments

> *Generated from architectural decisions in ADR 0010.*

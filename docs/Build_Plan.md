# Build Plan

Phased, step-by-step. One phase at a time. Do not start a phase until the previous phase's **checkpoint** passes. Effort figures are rough, for a solo developer working with an AI agent.

**Priority tiers:** P1 = must-have for the demo, P2 = should-have, P3 = stretch (cut first).

## Phase 0: Foundation (P1, about 3 hours)

Goal: a running skeleton with docs, tooling, and both apps starting.

1. Create the repo with `client/`, `server/`, `docs/`. Copy these docs into `docs/` and `AGENTS.md` into the root.
2. Server: Express + TypeScript, `/api/health` endpoint, env loader with validation, Mongo connection, error middleware, response helpers.
3. Client: Vite + React + TypeScript, Tailwind, shadcn/ui setup, router with placeholder pages, API client wrapper, React Query provider.
4. Tooling: ESLint, Prettier, strict TypeScript, Vitest on both sides, scripts from `Architecture.md` section 7 (stubs allowed).
5. Add `.env.example` and `.gitignore`.

**Checkpoint:** both apps start with one command; health endpoint reachable from the client; lint, typecheck, and an example test pass.
**Commit:** `phase0: project skeleton and tooling`

## Phase 1: Core domain logic, no UI (P1, about 4 hours)

Goal: the heart of the product, tested in isolation.

1. `computeEntryHash` with canonical JSON, and `verifyChain` pure function.
2. `polygonArea` (shoelace) and area conversion.
3. Risk rules R1 to R6 as pure functions, the engine, and `riskBand`.
4. Unit tests for every rule (triggered and not triggered) and for hash tamper detection.

**Checkpoint:** all unit tests pass; modifying any field of a sample chain makes `verifyChain` report the right broken entry.
**Commit:** `phase1: hash chain, geometry, risk engine with tests`

## Phase 2: Database models and seed (P1, about 5 hours)

Goal: the fictional mouza exists in the database.

1. Mongoose models and indexes per `Data_Model.md`.
2. Repositories for each collection.
3. Seed data file for 34 parcels, owners, and ledger scripts per `Seed_Data_Spec.md`; generator builds hashed chains.
4. Scripts: `seed`, `demo:tamper`, `demo:reset`, `seed:check`.

**Checkpoint:** `seed` runs twice with identical results; `seed:check` matches the expected table in `Risk_Rules.md`; all chains verify except after tamper.
**Commit:** `phase2: models, repositories, seed data`

## Phase 3: Authentication and roles (P1, about 4 hours)

1. Auth module: signup, login, logout, me; bcrypt; JWT cookie; rate limit on auth routes.
2. `authenticate` and `authorize` middleware.
3. Client: AuthProvider, login and signup pages, RequireAuth and RequireAuthority guards, role-aware navbar.
4. API tests: 401, 403, success; signup cannot create authority.

**Checkpoint:** user cannot reach authority routes (API 403, UI redirect); session survives refresh; logout works.
**Commit:** `phase3: auth and role guards`

## Phase 4: Parcel API and map view (P1, about 7 hours) ← the centerpiece

1. Parcel endpoints: list, search, detail (`API_Spec.md` section 2).
2. Client map: Leaflet `CRS.Simple`, decorative roads and river, parcel polygons colored by land type, legend.
3. Hover tooltip, click selection, URL sync (`?dag=`), search box with zoom.
4. Side panel with Details tab (owner, khatian owner, area, flags).
5. Loading, empty, and error states.

**Checkpoint:** all 34 parcels render; clicking shows the correct owner; searching "14" selects and zooms; refreshing with `?dag=14` restores selection.
**Commit:** `phase4: map view and parcel details`

## Phase 5: History timeline and integrity check (P1, about 4 hours) ← the new feature

1. Ledger service: read history, verify.
2. Endpoints: `GET history`, `GET history/verify`.
3. Client: History tab timeline, "Verify integrity" button, valid and invalid banners.
4. Run `demo:tamper`, confirm dag 18 fails with the right entry number; `demo:reset` restores.

**Checkpoint:** dag 3 verifies valid; dag 18 valid before tamper and invalid after, naming entry 2.
**Commit:** `phase5: history timeline and integrity verification`

## Phase 6: Risk assessment (P1, about 4 hours)

1. Risk service wiring engine to real data; store assessments.
2. Endpoints per `API_Spec.md` section 5.
3. Client: Risk tab, score gauge, finding cards, "My assessments" page.

**Checkpoint:** dags 3, 7, 14, 21, 29, 33 produce exactly the expected scores and findings.
**Commit:** `phase6: risk assessment end to end`

## Phase 7: Enquiries (P2, about 4 hours)

1. Enquiry endpoints and service rules (users see only their own; closed is final).
2. Client: Enquire tab, My enquiries page, authority inbox with reply and close.

**Checkpoint:** user submits; authority replies; user sees reply; closed enquiry rejects new activity.
**Commit:** `phase7: enquiry workflow`

## Phase 8: Authority tools (P2, about 6 hours)

1. Transaction endpoint with rules and chain append; parcel edit; dispute flag; owner create.
2. Audit log writes on every authority action; audit endpoint.
3. Client: authority dashboard, TransactionForm, ParcelForm, DisputeDialog, audit table.
4. Tests: wrong from-owner returns 409; ledger remains valid after live transactions; direct owner edit rejected.

**Checkpoint:** record a sale on a clean plot; owner changes; history shows a new valid entry; audit log shows the action.
**Commit:** `phase8: authority tools and audit log`

## Phase 9: Polish and demo readiness (P1, about 5 hours)

1. Empty, loading, error states everywhere; toasts; responsive pass; accessibility pass.
2. Playwright test for the full demo path (`Testing_Plan.md`).
3. README quick start, screenshots, demo script, and pitch outline.
4. Backup: record a short screen capture of the demo path.

**Checkpoint:** the demo path runs end to end from a freshly reset database without manual fixes.
**Commit:** `phase9: polish and demo`

## Stretch (P3, only if time remains)

- Risk heatmap layer on the map.
- Polygon drawing tool for authorities.
- Plot split and merge entries.
- Export a plot's history as a printable report.

## Cut list if time runs short (cut in this order)

1. Stretch items. 2. Parcel polygon editing. 3. Audit log UI (keep the writes). 4. Owner management UI. 5. Enquiry close action.
**Never cut:** map, auth, history timeline and integrity check, risk assessment, the seeded planted cases.

## Per-phase working loop

1. Open a fresh agent session and paste the session-start prompt from `Prompt_Playbook.md`.
2. Ask for a plan, review it, approve.
3. Implement in small steps; run tests after each.
4. Walk through the checkpoint yourself.
5. Commit, update docs if a contract changed, then move on.

## Risk register

| Risk | Mitigation |
|---|---|
| Map library learning curve | Do a tiny Leaflet `CRS.Simple` spike first in Phase 4. |
| Agent drifts from the data model | Keep `AGENTS.md` rules; reject unplanned changes. |
| Seed data takes too long to hand-craft | Use the generator approach in `Seed_Data_Spec.md`. |
| Solo time pressure | Follow the cut list; P1 phases first. |
| Demo failure on the day | Reset script, recorded backup, tested demo path. |

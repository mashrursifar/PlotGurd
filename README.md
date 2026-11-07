# PlotGuard

> Land records you can see, question, and trust.

PlotGuard is a land-records transparency and fraud-risk platform built for the **LandTech Innovation Hackathon 2026**. A fictional survey area (a *mouza*) is drawn as an interactive map. Every **dag** (plot) is a clickable polygon showing its current owner and details. Citizens enquire about plots and run rule-based risk assessments. Authorities maintain the records, and every change is written to a **tamper-evident, hash-chained history**.

> All data is **fictional**. PlotGuard is a prototype and gives no legal advice.

## Core features

1. **Interactive parcel map**: pan, zoom, hover, click a dag to open its details. Search by dag number.
2. **Two account types**: `user` (view, enquire, risk-check) and `authority` (everything a user can do, plus edit records and answer enquiries).
3. **Risk assessment**: a transparent rule engine scores a plot 0 to 100 and explains every rule that fired.
4. **Parcel History Timeline + Integrity Check (the new feature)**: each ownership change is chained by SHA-256 hash. Anyone can verify a plot's history has not been altered.
5. **Enquiry system**: users ask questions about a plot, authorities reply.

## Tech stack

React + TypeScript + Vite + Tailwind + shadcn/ui + react-router + React Query + Leaflet (`CRS.Simple`) on the client. Node.js + Express + TypeScript + Mongoose + zod on the server. MongoDB. JWT in an httpOnly cookie. Vitest, Supertest, Playwright for tests.

## Documentation map (read in this order)

| # | File | Purpose |
|---|---|---|
| 1 | `AGENTS.md` | Rules and workflow for the AI coding agent. Read first, every session. |
| 2 | `Product_Spec.md` | Goals, roles, user stories, acceptance criteria. |
| 3 | `Architecture.md` | System design, folder structure, flows, env vars. |
| 4 | `Data_Model.md` | Collections, fields, indexes, invariants, hash-chain definition. |
| 5 | `API_Spec.md` | Every endpoint, auth rule, request and response shape. |
| 6 | `Risk_Rules.md` | The rule engine specification. |
| 7 | `Design_Patterns.md` | Code patterns, conventions, anti-patterns. |
| 8 | `UI_UX_Spec.md` | Screens, map behaviour, components, states. |
| 9 | `Seed_Data_Spec.md` | The fictional mouza and planted fraud cases. |
| 10 | `Build_Plan.md` | Phased, step-by-step build with acceptance checks. |
| 11 | `Testing_Plan.md` | Test strategy and the demo-path test. |
| 12 | `Prompt_Playbook.md` | Ready prompts to drive Codex or Antigravity per phase. |

## Suggested repo layout

Put these files in `/docs` and copy `AGENTS.md` to the repo root so the coding agent loads it automatically.

## Quick start

1. Install dependencies from the repository root with `npm install`.
2. Start MongoDB as a single-node replica set (`mongod --replSet rs0 --dbpath <your-data-directory>`) and initialize it once with `mongosh --eval "rs.initiate()"`. Authority writes use transactions.
3. Copy `.env.example` to `.env`, replace `JWT_SECRET` with a private random value of at least 32 characters, and set the seed credentials used by the demo and reset scripts.
4. Run `npm run demo:reset` and then `npm run seed` from the repository root to load the fictional mouza.
5. Run `npm run seed:check` to verify the planted risk cases and ledger chains.
6. Run `npm run dev` to start the client and API together.
7. Open `http://127.0.0.1:5173`.

For the integrity demo, run `npm run demo:tamper` to intentionally corrupt dag 18, entry 2. Use `npm run demo:reset` to restore the seed data.

The health endpoint is available at `http://127.0.0.1:4000/api/health`.

### Browser test setup

Before running Playwright locally, install the browser runtime:

```bash
npx playwright install --with-deps chromium
```

Then run:

```bash
npm run test:e2e
```

## Screenshots

Capture these before the demo so judges can immediately understand the product:

- Map screen with all parcels and legend visible.
- Dag 14 selection panel with owner, land type, and status.
- History timeline with the Verify integrity banner.
- Risk report with the score gauge and rule findings.
- Authority transaction form after recording a transfer.

Suggested naming convention: `docs/screenshots/map-overview.png`, `docs/screenshots/dag-history.png`, `docs/screenshots/risk-score.png`, and `docs/screenshots/authority-transaction.png`.

## Demo script (2-minute walkthrough)

1. Open the app as a new user and land on the map.
2. Search for dag `14` and click the parcel to open the detail panel.
3. Review the current owner, status, and recorded details.
4. Open the History tab and click `Verify integrity` to show the valid chain.
5. Open the Risk tab and run the assessment to reveal the score and the fired rules.
6. Submit an enquiry about the parcel.
7. Run `npm run demo:tamper` to show a tampered history on dag `18` and confirm the integrity failure.
8. Log in as the seeded authority, reply to the enquiry, and record a valid sale on another parcel.
9. Confirm the owner changes and the history remains valid.

## Pitch outline (60 seconds)

"PlotGuard is a fictional land-records transparency platform built to make fraud visible. Citizens can search a dag, review ownership, run a rule-based risk assessment, and inspect a tamper-evident ledger. We protect the integrity of every ownership change through a hash-chained history so tampering is easy to spot. Authorities can record transfers, update parcel details, and answer enquiries. The result is a working prototype that helps people understand why a parcel is risky before signs of fraud become expensive legal disputes."

"The demo: a user searches a parcel, verifies its chain, sees a high-risk result, submits an enquiry, then watches the authority response and recorded transaction complete the story."

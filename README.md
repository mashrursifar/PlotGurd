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
2. Copy `.env.example` to `.env`, replace `JWT_SECRET` with a private random value of at least 32 characters, set both seed passwords, and start MongoDB.
3. Run `npm run seed` from the repository root to reset and load the fictional mouza.
4. Run `npm run seed:check` to verify the planted risk cases and ledger chains.
5. Run `npm run dev` to start the client and API together.
6. Open `http://127.0.0.1:5173`.

`npm run demo:tamper` intentionally corrupts dag 18 ledger entry 2 for the integrity demo. Use `npm run demo:reset` to restore the seed data.

The health endpoint is available at `http://127.0.0.1:4000/api/health`. Later-phase API and UI workflows are added as their phases are implemented.

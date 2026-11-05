# AGENTS.md: Rules for AI coding agents on PlotGuard

You are building **PlotGuard**, a land-records map and fraud-risk app (MERN + TypeScript) for a hackathon. A solo developer is directing you. Be precise, small-step, and verifiable.

## 0. Read before you act

At the start of every session read, in order: `docs/Product_Spec.md`, `docs/Architecture.md`, `docs/Data_Model.md`, `docs/API_Spec.md`, `docs/Design_Patterns.md`, and the section of `docs/Build_Plan.md` for the current phase. Read `Risk_Rules.md`, `UI_UX_Spec.md`, or `Seed_Data_Spec.md` when the task touches them. If docs conflict with the request, stop and ask.

## 1. Project facts

- Two roles: `user` and `authority`. Visitors can only sign up and log in.
- The map is a **flat, imaginary coordinate map** (Leaflet `CRS.Simple`). No real map tiles, no geographic coordinates.
- A parcel's current owner changes **only** through a transaction recorded in the hash-chained history. Never update `currentOwnerId` directly anywhere else.
- Risk assessment is **rule-based and deterministic**. No ML, no randomness.
- All data is fictional. Never add real names, real IDs, or real land records.

## 2. Stack (do not change without asking)

Client: React, TypeScript, Vite, Tailwind, shadcn/ui, react-router, TanStack React Query, react-leaflet. Server: Node.js, Express, TypeScript, Mongoose, zod, bcrypt, jsonwebtoken, cookie-parser, helmet, cors. DB: MongoDB. Tests: Vitest, Supertest, Playwright.

Do **not** add a dependency, change the data model, rename an endpoint, or change folder structure without asking first and getting approval.

## 3. Working method (every task)

1. **Restate** the task in two sentences and list assumptions.
2. **Plan**: list files you will create or change and why. Wait for approval on anything larger than a small fix.
3. **Implement** only what the task asks. No bonus features, no drive-by refactors.
4. **Verify**: run lint, type-check, and relevant tests. Provide exact manual test steps and the expected result.
5. **Report**: what changed, what was tested, what is left, any risk or open question.
6. Suggest a commit message in the form `phaseN: short summary`.

## 4. Coding rules

- TypeScript strict mode. No `any` unless justified in a comment.
- Follow `docs/Design_Patterns.md`: routes → controllers → services → repositories; zod validation at the boundary; centralized error handling.
- Controllers contain no business logic. Services contain no HTTP concepts.
- Every authority-only route uses the `authorize('authority')` middleware. Never trust a role sent from the client.
- Never return password hashes. Never log secrets or tokens.
- Use the shared response envelope in `API_Spec.md`.
- Name things in domain language: `parcel`, `dagNumber`, `khatianNumber`, `mouza`, `mutation`, `ledger entry`.
- Small functions, early returns, explicit return types on exported functions.
- Comments explain *why*, not *what*.
- UI follows `docs/UI_UX_Spec.md` section 10 exactly: use only its color, font, radius, and shadow tokens (configured once in the Tailwind theme and shadcn CSS variables). Never hardcode a color or invent a style in a component.

## 5. Security rules

- Passwords hashed with bcrypt. JWT in httpOnly, sameSite cookie. No token in localStorage.
- Validate and sanitize all input with zod. Reject unknown fields.
- Rate-limit auth routes.
- Authorities are created only by the seed script (or an existing authority), never by public signup. Signup always creates `role: user`.
- Secrets live in `.env`. Provide `.env.example`, never commit `.env`.

## 6. Testing rules

- Pure logic (risk rules, hash chain, area calculation) gets unit tests before or with implementation.
- Every protected endpoint has at least one test for: unauthenticated (401), wrong role (403), and success.
- Do not mark a task done while any test fails or is skipped.

## 7. Things you must never do

- Never edit `currentOwnerId` outside the transaction service.
- Never modify or delete a ledger entry. The history is append-only.
- Never silently change the seed data cases listed in `Seed_Data_Spec.md`; the demo depends on them.
- Never invent API fields or endpoints that are not in `API_Spec.md`; propose a change instead.
- Never claim something works without running it.

## 8. When blocked

State what you tried, the exact error, and two possible fixes. Ask the developer to choose. Do not guess and keep coding.

## 9. Definition of done (per task)

Code compiles, lint and type-check pass, tests pass, behaviour matches the acceptance check in `Build_Plan.md`, docs updated if a contract changed, and a manual test procedure is provided.

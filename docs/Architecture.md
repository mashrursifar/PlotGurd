# Architecture

## 1. Overview

A three-tier web app: React SPA, Express JSON API, MongoDB.

    Browser (React SPA, Leaflet map)
        |  HTTPS, JSON, httpOnly cookie
    Express API (TypeScript)
        routes -> controllers -> services -> repositories
        |
    MongoDB (Mongoose models)

## 2. Folder structure

    plotguard/
      AGENTS.md
      docs/                  (all planning docs)
      client/
        src/
          app/               router, providers, layout
          features/
            auth/            pages, hooks, api
            map/             MapView, ParcelLayer, SearchBox, Legend
            parcels/         ParcelPanel, tabs (Details, History, Risk, Enquire)
            risk/            RiskReport, ScoreBadge
            enquiries/       forms, lists
            authority/       dashboard, forms, inbox, audit view
          components/ui/     shadcn components
          lib/               api client, utils, constants
      server/
        src/
          config/            env, db connection
          middleware/        authenticate, authorize, validate, errorHandler, rateLimit
          modules/
            auth/            routes, controller, service, schema
            users/
            parcels/
            owners/
            ledger/          hash chain and history
            risk/            engine and rules
            enquiries/
            audit/
          utils/             hash, geometry, errors, response
          seed/              seed script, fixtures, tamper demo
        tests/
      shared/                (optional) shared types

## 3. Key decisions

| Decision | Choice | Reason |
|---|---|---|
| Map | Leaflet with `CRS.Simple`, parcels as GeoJSON-style polygons | Works for an imaginary area, no tiles needed. |
| Coordinates | Pixel-like plane, 1000 wide by 700 tall | Simple to author and render. |
| Auth | JWT in httpOnly sameSite cookie | Safer than localStorage, simple for SPA. |
| Validation | zod at route boundary | Typed, consistent errors. |
| Server state on client | TanStack React Query | Caching, loading and error states. |
| History integrity | Per-parcel SHA-256 hash chain | Easy to explain, verify, and demo. |
| Risk | Pure functions per rule, combined by engine | Testable, explainable. |
| Concurrency | Unique index on (parcelId, seq) | Prevents two entries claiming the same position. |

## 4. Coordinate system

- Map space: x from 0 to 1000, y from 0 to 700.
- Polygon points are stored as `[x, y]` pairs; the client converts to Leaflet `[lat, lng] = [y, x]`.
- Area in map units squared converts to decimals using the constant `AREA_SCALE` defined in server config (see `Risk_Rules.md`, rule R4).

## 5. Core flows

**Login**: client posts credentials, server verifies bcrypt hash, sets httpOnly cookie, client loads `/api/auth/me`, router shows role-based navigation.

**Open a plot**: map click selects parcel id, client fetches parcel detail, panel shows tabs. History and Risk tabs fetch lazily.

**Record a transfer (authority)**: controller validates body, service loads parcel, checks from-owner rule, builds ledger entry with prev-hash, computes entry hash, inserts entry, updates parcel owner and `updatedAt`, writes audit log. Failures leave no partial state (insert entry first with unique seq; update parcel second; on parcel update failure mark error and surface it; keep operations ordered and idempotent).

**Verify integrity**: ledger service loads entries ordered by seq, recomputes each hash, checks `prevHash` linkage, checks final to-owner equals parcel current owner, returns result.

**Risk assessment**: risk service loads parcel, ledger, enquiries/dispute flag, runs all rules, sums and caps score, stores assessment, returns report.

## 6. Environment variables

| Name | Purpose |
|---|---|
| `PORT` | API port |
| `MONGODB_URI` | Database connection |
| `JWT_SECRET` | Token signing secret |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. 7d |
| `CLIENT_ORIGIN` | Allowed CORS origin |
| `COOKIE_SECURE` | true in production |
| `AREA_SCALE` | Map-unit-squared to decimal conversion |
| `SEED_AUTHORITY_EMAIL` / `SEED_AUTHORITY_PASSWORD` | Seeded authority login |

## 7. Scripts (to be created in Phase 0 and 2)

`dev` (both apps), `build`, `lint`, `typecheck`, `test`, `test:e2e`, `seed` (reset and load data), `demo:tamper` (corrupt one ledger entry for the demo), `demo:reset`.

## 8. Error and response conventions

Success: `{ "success": true, "data": ... }`. Failure: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`. Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 429 rate limited, 500 unexpected.

## 9. Deployment (optional)

Client on a static host, API on a Node host, MongoDB Atlas free tier. Set production env vars and `COOKIE_SECURE=true`. For the hackathon, local demo plus a deployed backup is enough.

# Design Patterns and Conventions

## 1. Backend layering

    route -> controller -> service -> repository -> model

| Layer | Responsibility | Must not |
|---|---|---|
| Route | Path, middleware chain, schema binding | Contain logic |
| Controller | Parse request, call service, shape response | Touch the database or hold business rules |
| Service | Business rules, orchestration, transactions | Know about HTTP (no `req`/`res`) |
| Repository | Database queries via Mongoose | Contain business rules |
| Model | Schema, indexes | Contain logic beyond simple virtuals |

## 2. Patterns in use

- **Repository pattern** for all data access so services are easy to unit test with fakes.
- **Strategy pattern** for risk rules: each rule is an independent pure function behind one interface; the engine iterates them.
- **Append-only ledger** for history: only `append` and `read` operations exist. No update or delete function is ever written.
- **Chain of responsibility** for middleware: `rateLimit -> authenticate -> authorize(role) -> validate(schema) -> controller`.
- **DTO validation** with zod at the edge. Services receive already validated, typed input.
- **Centralized error handling**: throw typed `AppError(code, status, message)`; one error middleware formats the response.
- **Factory** for seed fixtures so test and seed data share builders.
- **Single source of truth functions**: one `computeEntryHash`, one `polygonArea`, one `riskBand`.

## 3. Authorization pattern

`authenticate` verifies the cookie and attaches `req.user`. `authorize('authority')` checks role. Resource ownership checks (for example, a user reading only their own enquiries) happen in the service, not the route.

## 4. Frontend structure

- **Feature folders**: each feature owns its pages, components, hooks, and API calls.
- **Server state** lives in React Query. Do not copy it into local state.
- **Auth state** lives in one `AuthProvider` context exposing `user`, `login`, `logout`, `isAuthority`.
- **Route guards**: `RequireAuth` and `RequireAuthority` wrapper components.
- **Container/presentational split**: hooks fetch data; components render it.
- **Map composition**: `MapView` owns the Leaflet map; `ParcelLayer`, `SearchBox`, `Legend` are children. Selected parcel id lives in the URL (`/map?dag=14`) so selections are shareable and survive refresh.
- **Forms**: controlled forms with zod schemas reused from `shared/` or mirrored from server schemas.
- **API client**: one wrapper that handles base URL, cookies, envelope unwrapping, and error mapping.

## 5. Naming

- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for components.
- Types and interfaces: `PascalCase`. Functions and variables: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Enums as string unions matching `Data_Model.md` exactly.
- Domain words, not generic ones: `parcel`, not `item`; `ledgerEntry`, not `record`.

## 6. Error handling

- Services throw `AppError`; never return error-shaped objects.
- Never swallow errors silently. Log with context, return a safe message.
- Client shows friendly messages and keeps the technical detail in the console.

## 7. Testing patterns

- Pure functions tested exhaustively (hash, geometry, rules).
- Services tested with in-memory or test database.
- API tested with Supertest covering 401, 403, success, and validation failure.
- One Playwright test follows the full demo path.

## 8. Anti-patterns (reject these in review)

- Business logic in controllers or React components.
- Updating `currentOwnerId` outside the ledger service.
- Editing or deleting ledger entries.
- Trusting a role from the request body.
- Storing JWT in localStorage.
- Hardcoding map coordinates in components instead of loading from the API.
- Copying server data into global client state.
- Large unreviewed multi-feature changes in one step.
- Adding libraries for trivial problems.

## 9. Code review checklist

Does it follow the layer rules? Are inputs validated? Is the route protected correctly? Are there tests? Does it keep invariants in `Data_Model.md`? Does it match `API_Spec.md` exactly? Are loading, empty, and error states handled?

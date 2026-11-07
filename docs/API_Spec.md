# API Spec

Base path: `/api`. JSON only. Auth via httpOnly cookie. All responses use the envelope in `Architecture.md` section 8.

Legend for access: **Public** = no login, **User** = any logged-in account, **Authority** = authority only.

## 1. Auth

| Method and path | Access | Body | Returns |
|---|---|---|---|
| `POST /auth/signup` | Public | `name`, `email`, `password` (min 8, letter and number) | user (no hash), sets cookie |
| `POST /auth/login` | Public | `email`, `password` | user, sets cookie |
| `POST /auth/logout` | User | none | success |
| `GET /auth/me` | User | none | current user |

Errors: 409 email exists, 401 invalid credentials (generic message).

## 2. Parcels

| Method and path | Access | Notes |
|---|---|---|
| `GET /parcels` | User | Light list for the map: id, dagNumber, landType, polygon, status, disputeFlag, ownerName. |
| `GET /parcels/search?dag=14` | User | Returns matching parcel or 404. |
| `GET /parcels/:id` | User | Full detail: owner, khatian owner, area, computed polygon area, flags. |
| `POST /parcels` | Authority | Body: `mouza`, `dagNumber`, `khatianNumber`, `landType`, `recordedAreaDecimal`, `polygon`, `currentOwnerId`. Creates a parcel and its initial REGISTRATION entry; the initial khatian owner is the same owner. |
| `PATCH /parcels/:id` | Authority | Update non-owner fields only (landType, area, khatianNumber, status, polygon). |
| `PATCH /parcels/:id/dispute` | Authority | Body: `disputeFlag`, `disputeReason`. |

`GET /parcels` returns map items with `id`, `dagNumber`, `landType`, `polygon`,
`status`, `disputeFlag`, and `ownerName`. Search returns the parcel detail shape:
`id`, `mouza`, `dagNumber`, `khatianNumber`, `landType`,
`recordedAreaDecimal`, `computedAreaDecimal`, `polygon`, `currentOwner`
(`id`, `name`), `khatianOwner` (`id`, `name`), `status`, `disputeFlag`, and
`disputeReason`. `computedAreaDecimal` is the polygon area multiplied by
`AREA_SCALE`, so it uses the same units as `recordedAreaDecimal`.

`PATCH /parcels/:id` must reject `currentOwnerId` and `khatianOwnerId` (400).
`POST /parcels` accepts `currentOwnerId` only as the initial owner for its
REGISTRATION entry; it does not permit direct ownership changes to existing
parcels.

## 3. Owners

| Method and path | Access | Notes |
|---|---|---|
| `GET /owners` | Authority | List and filter by `name`. |
| `POST /owners` | Authority | Body: `name`, `nationalId`, `address`. |
| `GET /owners/:id` | User | Public summary: name only plus parcel count. |

## 4. History (ledger)

| Method and path | Access | Notes |
|---|---|---|
| `GET /parcels/:id/history` | User | Ordered entries with owner names, no internal ids beyond needed. |
| `GET /parcels/:id/history/verify` | User | Returns verification result. |
| `POST /parcels/:id/transactions` | Authority | Body: `type`, `fromOwnerId`, `toOwnerId`, `effectiveDate`, `note`. Rules per `Data_Model.md` entry semantics. |

`GET /parcels/:id/history` returns an ordered array of entries with `seq`,
`type`, `fromOwner`, `toOwner`, `effectiveDate`, `performedBy`, `source`,
`note`, and `entryHash`. Owner and performer fields are names, not internal
identifiers. `entryHash` is the full SHA-256 hex digest; clients may display a
shortened form.

Errors: 409 when `fromOwnerId` is not the current owner; 400 for a CORRECTION without a note; 409 on a sequence collision (client may retry).

## 5. Risk

| Method and path | Access | Notes |
|---|---|---|
| `POST /parcels/:id/risk` | User | Runs engine, stores assessment, returns report. |
| `GET /parcels/:id/risk/latest` | User | Latest stored assessment for this user and parcel, or 404. |
| `GET /risk/mine` | User | Current user's past assessments. |
| `GET /risk/all` | Authority | All assessments, filter by band. |

Report shape: `{ score, band, findings: [{ ruleId, name, points, severity, explanation, evidence }], ruleVersion, generatedAt }`.

## 6. Enquiries

| Method and path | Access | Notes |
|---|---|---|
| `POST /enquiries` | User | Body: `parcelId`, `question`. |
| `GET /enquiries/mine` | User | Own enquiries with replies. |
| `GET /enquiries` | Authority | All, filter by status. |
| `PATCH /enquiries/:id/reply` | Authority | Body: `reply`; sets `ANSWERED`. |
| `PATCH /enquiries/:id/close` | Authority | Sets `CLOSED`. |

## 7. Audit

| Method and path | Access | Notes |
|---|---|---|
| `GET /audit` | Authority | Paginated, newest first; accepts `page`, `limit`, `action`, and `target` filters. |

## 8. Pagination and filtering

List endpoints that can grow (`/enquiries`, `/audit`, `/risk/all`) accept `page` and `limit` (default 1 and 20, max 100) and return `{ items, page, limit, total }`.

Audit items contain `id`, `actorId`, `action`, `targetType`, `targetId`,
`summary`, `meta`, and `createdAt`.

## 9. Standard error codes

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## 10. Contract change rule

Any new endpoint or field must be added to this file first, approved by the developer, then implemented.

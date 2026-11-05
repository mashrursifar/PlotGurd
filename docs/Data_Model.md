# Data Model

All collections use MongoDB with Mongoose. All timestamps are ISO dates (`createdAt`, `updatedAt` on every collection unless noted).

## 1. users

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | required |
| `email` | string | required, unique, lowercase |
| `passwordHash` | string | bcrypt, never returned |
| `role` | `user` or `authority` | default `user` |

Index: unique on `email`.

## 2. owners

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | fictional |
| `nationalId` | string | fictional, unique |
| `address` | string | fictional |

## 3. parcels

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `mouza` | string | e.g. "Kalpanapur" |
| `dagNumber` | string | unique within mouza |
| `khatianNumber` | string | |
| `landType` | enum | `AGRICULTURAL`, `RESIDENTIAL`, `COMMERCIAL`, `WETLAND`, `GOVERNMENT` |
| `recordedAreaDecimal` | number | area on record, in decimals |
| `polygon` | array of `[x, y]` | at least 3 points, map space 0..1000 by 0..700 |
| `currentOwnerId` | ObjectId ref owners | changed only by the ledger service |
| `khatianOwnerId` | ObjectId ref owners | owner shown on the khatian record; updated by MUTATION entries |
| `status` | enum | `ACTIVE`, `UNDER_REVIEW` |
| `disputeFlag` | boolean | default false |
| `disputeReason` | string or null | |

Indexes: unique on (`mouza`, `dagNumber`).

## 4. ledger_entries (append-only history)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `parcelId` | ObjectId | |
| `seq` | integer | starts at 1 per parcel |
| `type` | enum | `REGISTRATION`, `SALE`, `INHERITANCE`, `GIFT`, `MUTATION`, `CORRECTION` |
| `fromOwnerId` | ObjectId or null | null for REGISTRATION |
| `toOwnerId` | ObjectId | |
| `effectiveDate` | date | when the event took effect |
| `performedBy` | ObjectId ref users | authority who recorded it; seed uses a system user |
| `source` | enum | `LIVE`, `LEGACY_IMPORT` |
| `note` | string | optional |
| `prevHash` | string | `GENESIS` for seq 1 |
| `entryHash` | string | SHA-256 hex |
| `createdAt` | date | not part of the hash |

Indexes: unique on (`parcelId`, `seq`). No update or delete operations exist in code for this collection.

### Hash definition

`entryHash = SHA-256( canonicalJson({ parcelId, seq, type, fromOwnerId, toOwnerId, effectiveDate, performedBy, source, note, prevHash }) )`

Canonical JSON rules: keys sorted alphabetically, ids as strings, dates as ISO strings, null kept as null, no whitespace. Put this in one shared function used by both writing and verifying.

### Verification algorithm

1. Load entries by `seq` ascending.
2. Check `seq` runs 1..n with no gaps.
3. Check entry 1 has `prevHash = GENESIS`; each later `prevHash` equals the previous `entryHash`.
4. Recompute every hash and compare to stored.
5. Check the last entry's `toOwnerId` equals the parcel's `currentOwnerId` (MUTATION and CORRECTION entries keep owner semantics described below).
6. Return `{ valid, entriesChecked, firstBrokenSeq, reason }`.

### Entry semantics

| Type | Changes `currentOwnerId` | Changes `khatianOwnerId` | From-owner rule |
|---|---|---|---|
| REGISTRATION | sets initial | sets initial | none (first entry only) |
| SALE | to `toOwnerId` | no | `fromOwnerId` must equal current owner (LIVE) |
| INHERITANCE | to `toOwnerId` | no | same |
| GIFT | to `toOwnerId` | no | same |
| MUTATION | no | to current owner | `fromOwnerId` null; `toOwnerId` must equal current owner |
| CORRECTION | to `toOwnerId` | to `toOwnerId` | requires a note explaining why |

`LEGACY_IMPORT` entries come only from the seed and may violate the from-owner rule. They are how the planted fraud cases exist.

## 5. enquiries

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `parcelId` | ObjectId | |
| `userId` | ObjectId | |
| `question` | string | 10 to 1000 chars |
| `status` | enum | `OPEN`, `ANSWERED`, `CLOSED` |
| `reply` | string or null | |
| `repliedBy` | ObjectId or null | |
| `repliedAt` | date or null | |

## 6. risk_assessments

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `parcelId` | ObjectId | |
| `userId` | ObjectId | |
| `score` | integer 0..100 | |
| `band` | enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `findings` | array | each: `ruleId`, `name`, `points`, `severity`, `explanation`, `evidence` |
| `ruleVersion` | string | e.g. `1.0` |

## 7. audit_logs

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `actorId` | ObjectId | |
| `action` | string | e.g. `PARCEL_UPDATE`, `LEDGER_APPEND`, `DISPUTE_SET`, `ENQUIRY_REPLY` |
| `targetType` | string | `parcel`, `enquiry`, `user` |
| `targetId` | ObjectId | |
| `summary` | string | human-readable |
| `meta` | object | optional extra |

Audit logs record who did what. Ledger entries record the history of a plot. Do not mix them.

## 8. Invariants (the agent must preserve these)

1. `currentOwnerId` changes only inside the ledger service.
2. Ledger entries are never edited or deleted.
3. Each parcel has exactly one chain, `seq` contiguous from 1.
4. Signup never creates an authority.
5. A parcel always has at least a REGISTRATION entry.
6. Risk assessments are stored, never edited.

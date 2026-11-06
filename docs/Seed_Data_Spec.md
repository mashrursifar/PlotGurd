# Seed Data Spec

All data is **fictional**. Names, IDs, and places do not refer to real people or records.

## 1. The mouza

Name: **Kalpanapur Mouza** (fictional). Map space 1000 by 700. A river runs diagonally across the lower right, a main road crosses horizontally near the middle, a feeder road runs vertically on the left. These are decorative shapes loaded with the map, not parcels.

Parcels: **34 dags** numbered 1 to 34, arranged on a compact grid with irregular edges and narrow corridors for the road network, avoiding overlaps. Each parcel polygon has 4 to 6 points. Recorded areas are consistent with polygon sizes using `AREA_SCALE`, except the planted case below.

Land type mix: about 14 agricultural, 10 residential, 4 commercial, 3 wetland near the river, 3 government.

## 2. Owners

About 20 fictional owners with invented names and 13-digit fictional IDs. A few owners hold two or three plots. Include one government owner entity for government land.

## 3. Accounts

| Role | Email | Notes |
|---|---|---|
| authority | from `SEED_AUTHORITY_EMAIL` | password from env, never committed |
| user | `demo.user@plotguard.test` | password from env or documented in README |
| system | internal | `performedBy` for legacy entries; cannot log in |

## 4. Ledger generation

Every parcel gets a valid hash chain: REGISTRATION first, then 0 to 4 further entries with dates spread across the last 10 years. Entries are generated through the same hash function used in production. Parcels end with `currentOwnerId` matching the last ownership-changing entry unless a planted case says otherwise.

## 5. Planted cases (do not change; the demo depends on them)

| Dag | Case | Construction | Expected result |
|---|---|---|---|
| 3 | Clean plot | Two valid transfers, mutation done, area matches | Score 0, LOW, integrity valid |
| 7 | Rapid transfers | Three SALE entries within about 8 months, all valid chain, mutation done | R3, score 20 |
| 14 | Double sale | Owner A sells to B, later `LEGACY_IMPORT` SALE from A to C. Current owner C, khatian owner B | R1 and R2, score 70, HIGH |
| 18 | Tamper demo | Clean and valid in the seed. `npm run demo:tamper` edits the `note` of entry 2 directly in the database | Valid before, R6 and integrity failure after |
| 21 | Mutation mismatch | SALE 200 days ago, no MUTATION afterward, khatian owner still the seller | R2, score 30, MEDIUM |
| 29 | Area mismatch | Recorded area about 35 percent smaller than polygon implies | R4, score 15 |
| 33 | Disputed | `disputeFlag` true with reason "Boundary disagreement between neighbours" | R5, score 25, MEDIUM |

All other parcels should score 0 or only trivial findings. After seeding, a script check must assert the expected scores in `Risk_Rules.md` section 5.

## 6. Sample enquiries

Seed three enquiries from the demo user: one OPEN on dag 14, one ANSWERED on dag 21 with an authority reply, one CLOSED on dag 3.

## 7. Scripts

- `seed`: drops and recreates everything deterministically (use a fixed random seed so results are identical each run).
- `demo:tamper`: modifies the stored note on dag 18 entry 2 without recomputing its hash.
- `demo:reset`: re-runs `seed`.
- `seed:check`: runs the engine on dags 3, 7, 14, 21, 29, 33 and prints pass or fail against the expected table.

## 8. Authoring approach for the AI

Define parcels in a data file (id, dag, khatian, landType, polygon points, area, owners, ledger script) and write a generator that builds ledger entries with hashes. Do not hand-write hash values. Validate polygons for no overlap in a script check.

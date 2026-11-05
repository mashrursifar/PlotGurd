# Risk Rules (rule engine v1.0)

The risk engine is **deterministic and explainable**. Same data in, same score out. It is an advisory prototype on fictional data, not legal advice.

## 1. Engine contract

Input: parcel, its ledger entries (ordered), integrity verification result, current date.
Each rule is a pure function returning `null` (not triggered) or a finding:

    { ruleId, name, points, severity, explanation, evidence }

The engine runs all rules, sums `points`, caps at 100, assigns a band, and returns findings sorted by points descending.

## 2. Bands

| Score | Band |
|---|---|
| 0 to 24 | LOW |
| 25 to 49 | MEDIUM |
| 50 to 74 | HIGH |
| 75 to 100 | CRITICAL |

## 3. Rules

### R1 DOUBLE_SALE (40 points, severity high)
Triggered when two or more `SALE` entries have the same `fromOwnerId` for this parcel and no ownership-changing entry returns the parcel to that owner in between.
*Explanation:* "The same seller appears to have sold this plot more than once."
*Evidence:* the two entry numbers, seller, buyers, dates.

### R2 MUTATION_MISMATCH (30 points, severity high)
Triggered if any of:
- (a) `currentOwnerId` differs from `khatianOwnerId`.
- (b) The latest ownership-changing entry is older than `MUTATION_GRACE_DAYS` (default 90) and no `MUTATION` entry follows it.
*Explanation:* "The ownership record has not been updated to match the latest transfer."
*Evidence:* which sub-check fired, owner names, days elapsed.

### R3 RAPID_TRANSFERS (20 points, severity medium)
Triggered when 3 or more ownership-changing entries (`SALE`, `INHERITANCE`, `GIFT`, `CORRECTION`) have `effectiveDate` within any rolling 365-day window.
*Explanation:* "This plot changed hands several times in a short period."
*Evidence:* the entries and the window.

### R4 AREA_MISMATCH (15 points, severity medium)
Computed area = polygon area (shoelace formula, map units squared) times `AREA_SCALE`. Triggered when the absolute difference from `recordedAreaDecimal` exceeds 10 percent of the recorded area.
*Explanation:* "The drawn plot size does not match the recorded area."
*Evidence:* recorded value, computed value, percent difference.

### R5 DISPUTE_FLAG (25 points, severity high)
Triggered when `disputeFlag` is true.
*Explanation:* "An authority has marked this plot as disputed."
*Evidence:* the dispute reason.

### R6 CHAIN_BROKEN (50 points, severity critical)
Triggered when history verification fails.
*Explanation:* "The history of this plot does not pass its integrity check; records may have been altered."
*Evidence:* first broken entry number and reason.

## 4. Configurable constants (single config file)

`MUTATION_GRACE_DAYS = 90`, `RAPID_WINDOW_DAYS = 365`, `RAPID_MIN_TRANSFERS = 3`, `AREA_TOLERANCE = 0.10`, `AREA_SCALE` (from env), `RULE_VERSION = "1.0"`.

## 5. Expected results for the seed data

| Dag | Expected findings | Expected score | Band |
|---|---|---|---|
| 3 (clean) | none | 0 | LOW |
| 7 (rapid transfers) | R3 | 20 | LOW |
| 14 (double sale) | R1, R2 | 70 | HIGH |
| 18 (after `demo:tamper` runs; clean and score 0 before) | R6 | 50 | HIGH |
| 21 (mutation mismatch) | R2 | 30 | MEDIUM |
| 29 (area mismatch) | R4 | 15 | LOW |
| 33 (disputed) | R5 | 25 | MEDIUM |

These figures are the acceptance test for the engine. If the seed changes, update this table.

## 6. Adding a rule

1. Add its description here with points and an expected seed case.
2. Implement it as a pure function in `server/src/modules/risk/rules/`.
3. Register it in the engine rule list.
4. Add unit tests for triggered and not-triggered cases.

## 7. Presentation rules

The UI shows the score, band, and each finding as a card with title, points, plain explanation, and expandable evidence. Never show a score without its reasons.

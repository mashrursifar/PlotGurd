# Testing Plan

## 1. Strategy

Test the logic that matters most (hash chain, risk rules, permissions) deeply, and the demo path end to end. Keep the rest light.

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | Hash, chain verification, geometry, each risk rule, band mapping |
| Service | Vitest + test database | Ledger append rules, enquiry rules, risk service |
| API | Vitest + Supertest | Auth, role checks, validation, contract shapes |
| End to end | Playwright | The demo path |
| Manual | Checklist below | Responsive and accessibility pass |

## 2. Unit test cases

**Hash and chain**
- Same entry hashes identically regardless of key order.
- Changing any hashed field changes the hash.
- Valid chain verifies; tampered note, reordered entries, deleted entry, and wrong `prevHash` each fail with the correct `firstBrokenSeq`.
- Final owner mismatch fails.

**Geometry:** square, triangle, and irregular polygon areas; clockwise and counter-clockwise give the same area.

**Risk rules (each: triggered, not triggered, boundary)**
- R1: two sales by one seller triggers; sale, then sale back, then sale again does not.
- R2: owner mismatch triggers; 89 days without mutation does not, 91 days does.
- R3: 3 transfers within 365 days triggers; 2 does not; 3 spread over 400 days does not.
- R4: 10 percent exactly does not trigger; above does.
- R5: flag true triggers.
- R6: failed verification triggers.
- Engine: sums, caps at 100, sorts, band edges at 24/25, 49/50, 74/75.

## 3. API test matrix

| Endpoint group | 401 | 403 | Success | Validation |
|---|---|---|---|---|
| Auth | n/a | n/a | signup, login, me, logout | bad email, weak password, duplicate |
| Parcels read | yes | no | list, detail, search | bad id |
| Parcels write | yes | user gets 403 | authority ok | owner fields rejected |
| History | yes | no | read, verify | unknown parcel 404 |
| Transactions | yes | user gets 403 | valid sale | wrong from-owner 409, missing note 400 |
| Risk | yes | no | run and fetch | unknown parcel 404 |
| Enquiries | yes | authority-only routes 403 | submit, reply, close | short question |
| Audit | yes | user gets 403 | authority list | pagination bounds |

Additional checks: signup with `role: authority` in the body still creates a user; password hash never appears in any response; users cannot read other users' enquiries.

## 4. End-to-end demo path (Playwright)

1. Reset and seed the database.
2. Sign up a new user, land on the map.
3. Search "14"; panel shows the correct owner.
4. Open History; click Verify; see valid on dag 3, then repeat for dag 14.
5. Run risk on dag 14; expect HIGH with findings R1 and R2.
6. Submit an enquiry on dag 14.
7. Run `demo:tamper`; verify dag 18 shows invalid at entry 2.
8. Log out; log in as authority; reply to the enquiry.
9. Record a sale on dag 3; check the history gains a valid entry and the owner updates.
10. Confirm the user account cannot open `/authority` (redirect).

## 5. Manual checklist

- Map: smooth pan and zoom, hover tooltip, selection highlight, legend readable.
- Keyboard: tab through nav, tabs in the panel, forms.
- Mobile width: panel becomes bottom sheet, search usable.
- Contrast and color independence: land type shown in text in the panel.
- Error cases: stop the API and confirm friendly errors, no blank screens.
- Fresh reset: `demo:reset` then the full path again.

## 6. Quality gates before each commit

Lint passes, typecheck passes, unit and API tests pass, no skipped tests, no secrets committed, docs updated if a contract changed.

## 7. Bug triage

P0: demo path broken or security hole. P1: wrong data or broken role rule. P2: UI glitches. Fix in that order.

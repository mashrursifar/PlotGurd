# Product Spec

## 1. Problem

Land fraud thrives on opaque records: plots sold twice, ownership that differs between registers, history that can be quietly edited. Citizens cannot easily see a plot's status, and authorities lack a simple way to flag inconsistencies.

## 2. Vision

A map-first platform where anyone with an account can find a dag, see who owns it, review its history, and get an explained risk score. Authorities manage records, and every change is cryptographically chained so tampering is detectable.

## 3. Goals and non-goals

**Goals**
- Interactive fictional mouza map with clickable dag polygons.
- Role-based accounts: `user` and `authority`.
- Explainable, rule-based risk assessment.
- Tamper-evident ownership history with a one-click integrity check.
- Enquiry workflow between users and authorities.

**Non-goals (out of scope)**
- Real land data, real maps, real payments or legal filings.
- Machine learning, OCR, document uploads, blockchain networks.
- Multi-mouza or multi-district support.
- Plot splitting and merging (stretch only).
- Email or SMS notifications.

## 3.1 Glossary

| Term | Meaning |
|---|---|
| Mouza | A revenue/survey area containing many plots. |
| Dag number | The plot number in the survey of a mouza. |
| Khatian | The record of ownership entries in a mouza. |
| Mutation | Updating the khatian record to reflect a transfer of ownership. |
| Ledger entry | One record in a plot's append-only, hash-chained history. |

## 4. Roles

| Capability | Visitor | User | Authority |
|---|---|---|---|
| Sign up / log in | yes | yes | yes |
| View map and plot details | no | yes | yes |
| Search by dag number | no | yes | yes |
| View plot history timeline | no | yes | yes |
| Verify history integrity | no | yes | yes |
| Run risk assessment | no | yes | yes |
| Submit enquiry | no | yes | yes |
| View own enquiries and replies | no | yes | yes |
| Create or edit parcels and owners | no | no | yes |
| Record transfers, mutations, corrections | no | no | yes |
| Set or clear dispute flag | no | no | yes |
| Reply to and close enquiries | no | no | yes |
| View global audit log | no | no | yes |

## 5. User stories and acceptance criteria

### Accounts
- **US-01** As a visitor I can sign up with name, email, password. *AC:* creates `role: user`; duplicate email rejected; weak password rejected.
- **US-02** As a registered person I can log in and log out. *AC:* wrong credentials give a generic error; session persists on refresh; logout clears the cookie.
- **US-03** As an authority I can log in with a seeded account. *AC:* nav shows authority tools; user accounts never see them.

### Map and parcels
- **US-10** As a user I see the mouza map with all dags drawn. *AC:* all parcels render; pan and zoom work; legend visible.
- **US-11** As a user I click a dag and see owner, area, land type, status. *AC:* side panel opens in under one second; selected polygon highlighted.
- **US-12** As a user I search a dag number and the map zooms to it. *AC:* valid dag selects and zooms; invalid dag shows "not found".
- **US-13** As a user I see hover feedback over parcels. *AC:* hover shows dag number tooltip and highlight.

### History and integrity (new feature)
- **US-20** As a user I view a plot's ownership timeline. *AC:* entries in order with type, from, to, date, performed by.
- **US-21** As a user I click "Verify integrity". *AC:* returns valid, or invalid with the first broken entry number.
- **US-22** As an authority every change I make is appended to the history. *AC:* entry created with correct prev-hash; edits cannot alter old entries.

### Risk
- **US-30** As a user I run a risk assessment on a plot. *AC:* score 0 to 100, band, list of fired rules with plain-language explanations and evidence.
- **US-31** As a user I see my past assessments. *AC:* list with date, dag, score, band.

### Enquiries
- **US-40** As a user I submit an enquiry about a plot. *AC:* stored with status `OPEN`; appears in "My enquiries".
- **US-41** As an authority I see all enquiries and reply. *AC:* reply stored, status becomes `ANSWERED`; user sees reply.
- **US-42** As an authority I close an enquiry. *AC:* status `CLOSED`; user can no longer add to it.

### Authority tools
- **US-50** As an authority I create or edit a parcel's details. *AC:* validated; logged to audit log.
- **US-51** As an authority I record a sale, inheritance, gift, mutation, or correction. *AC:* the from-owner must equal the current owner (except mutation and correction); current owner updated; ledger entry chained.
- **US-52** As an authority I set or clear a dispute flag with a reason. *AC:* flag appears in risk assessment.

## 6. Non-functional requirements

- Map interactions stay smooth with up to 100 parcels.
- API responses under 500 ms locally for normal requests.
- Responsive from tablet width up; map usable on mobile.
- Accessible: keyboard focus visible, sufficient color contrast, parcel info available as text, not color alone.
- Clear loading, empty, and error states on every screen.
- Reproducible demo: one command resets and reseeds data.

## 7. Success criteria for the hackathon demo

A judge can: sign up, find a dag, see its owner, open its timeline, run risk on a planted bad plot and see why it scores high, verify a clean plot, see a tampered plot fail verification, then log in as an authority, reply to an enquiry and record a transfer.

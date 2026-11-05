# Prompt Playbook

How to drive Codex, Antigravity, or any coding agent with these docs. The idea: give context, ask for a plan, approve, implement small, verify, commit.

## 1. Session-start prompt (paste at the beginning of every session)

> You are working on PlotGuard. Read `AGENTS.md`, then `docs/Product_Spec.md`, `docs/Architecture.md`, `docs/Data_Model.md`, `docs/API_Spec.md`, and `docs/Design_Patterns.md`. We are in **Phase N** of `docs/Build_Plan.md`; completed so far: [list]. Confirm you understand the rules, summarize the current phase in five lines, and wait for my task. Do not write code yet.

## 2. Prompt shape for any task

1. **Context:** phase, what is already done.
2. **Goal:** one outcome.
3. **Read:** which docs apply.
4. **Constraints:** what not to touch.
5. **Process:** "List files to create or change, wait for approval, then implement, then run tests and give manual steps."
6. **Done when:** the checkpoint from `Build_Plan.md`.

## 3. Phase prompts

**Phase 0**
> Goal: create the project skeleton described in Build_Plan Phase 0. Read Architecture.md sections 2, 7, 8. Propose the exact folder tree and the package list first. Do not implement features. Done when both apps start with one command and the health endpoint works from the client.

**Phase 1**
> Goal: implement only the pure functions: `computeEntryHash`, `verifyChain`, `polygonArea`, the six risk rules, the engine, and `riskBand`. Read Data_Model.md section 4 and Risk_Rules.md completely. No database, no routes. Write the unit tests listed in Testing_Plan.md section 2. Done when all tests pass and tampering is detected with the correct entry number.

**Phase 2**
> Goal: create Mongoose models, repositories, and the seed generator. Read Data_Model.md and Seed_Data_Spec.md. Do not hand-write hash values; use `computeEntryHash`. Implement the four scripts. Done when `seed:check` matches Risk_Rules.md section 5.

**Phase 3**
> Goal: implement auth and role guards, server and client. Read API_Spec.md section 1 and AGENTS.md section 5. Signup must always create role `user`. Write the 401, 403, success tests. Done when the Phase 3 checkpoint passes.

**Phase 4**
> Goal: build the map view. First, make a tiny Leaflet `CRS.Simple` spike that draws two polygons and proves coordinate conversion `[x, y]` to `[y, x]`; show me, then continue. Read UI_UX_Spec.md section 4 and API_Spec.md section 2. Selected parcel must live in the URL. Done when all 34 parcels render and `?dag=14` restores the selection.

**Phase 5**
> Goal: ledger read and verify endpoints plus the History tab with the integrity banner. Read Data_Model.md section 4 and UI_UX_Spec.md section 5. Do not add any write endpoint to the ledger in this phase. Done when dag 3 is valid and dag 18 fails at entry 2 after `demo:tamper`.

**Phase 6**
> Goal: wire the risk engine to real data, add endpoints and the Risk tab. Read Risk_Rules.md and UI_UX_Spec.md section 8. Do not change rule logic. Done when scores for dags 3, 7, 14, 21, 29, 33 equal the expected table.

**Phase 7**
> Goal: implement the enquiry workflow. Read API_Spec.md section 6 and Product_Spec.md US-40 to US-42. Users must only see their own enquiries; test that explicitly.

**Phase 8**
> Goal: implement authority tools. Read Data_Model.md entry semantics and invariants. The transaction service must be the only code that changes `currentOwnerId`. Add audit log writes. Write the 409 and chain-validity tests.

**Phase 9**
> Goal: polish and the Playwright demo test. Read Testing_Plan.md sections 4 and 5. Do not add features. Fix only bugs and UX states. Done when the full demo path passes from a clean reset.

## 4. Utility prompts

**Plan review**
> Before coding, list the files you will touch, any new dependencies, and any assumption that is not in the docs. Flag anything that conflicts with AGENTS.md.

**Bug fix**
> Here is the exact error and the relevant file: [paste]. Explain the root cause in three sentences, propose the smallest fix, then apply it and add a test that would have caught it.

**Code review**
> Review the last change against Design_Patterns.md section 9 and the invariants in Data_Model.md section 8. List violations by severity. Do not fix yet.

**Drift check**
> Compare the implemented endpoints and models with API_Spec.md and Data_Model.md. List every difference. Do not change code; I will decide which side is right.

**Refactor guard**
> Refactor only [file or function] for readability. Behaviour and public interfaces must not change. Show that all tests still pass.

**Security pass**
> Audit auth, cookies, role checks, input validation, and error messages against AGENTS.md section 5. Report issues with file and line, ranked.

**Doc sync**
> Update the docs to match the final implementation for any contract that changed. Show a diff of docs only.

## 5. Habits that keep AI-driven development on track

- One phase, one task at a time; never "build the whole app".
- Fresh session per phase, with the session-start prompt.
- Plan first, code second; read the plan before approving.
- Run the checkpoint yourself; do not trust "done".
- Commit after every working step so you can roll back.
- Paste exact errors, not descriptions.
- If the agent wants to change a contract, change the doc first, then the code.
- Keep the planted seed cases untouched; they are your demo.

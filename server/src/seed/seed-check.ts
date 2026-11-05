import { verifyChain } from "../modules/ledger/hash-chain.js";
import { listLedgerEntries } from "../modules/ledger/ledger-entry.repository.js";
import { findOwnerById } from "../modules/owners/owner.repository.js";
import {
  findParcelByDag,
  listParcels,
} from "../modules/parcels/parcel.repository.js";
import { runRiskEngine } from "../modules/risk/engine.js";
import type { RiskBand } from "../modules/risk/types.js";
import { withDatabase, runCli } from "./database-cli.js";
import { MOUZA_NAME } from "./fixtures.js";

interface ExpectedRisk {
  findings: string[];
  score: number;
  band: RiskBand;
}

const EXPECTED_RISK = new Map<number, ExpectedRisk>([
  [3, { findings: [], score: 0, band: "LOW" }],
  [7, { findings: ["R3"], score: 20, band: "LOW" }],
  [14, { findings: ["R1", "R2"], score: 70, band: "HIGH" }],
  [21, { findings: ["R2"], score: 30, band: "MEDIUM" }],
  [29, { findings: ["R4"], score: 15, band: "LOW" }],
  [33, { findings: ["R5"], score: 25, band: "MEDIUM" }],
]);

async function checkDag(dag: number, expected: ExpectedRisk): Promise<boolean> {
  const parcel = await findParcelByDag(MOUZA_NAME, String(dag));

  if (!parcel?._id) {
    console.error(`FAIL dag ${dag}: parcel is missing.`);
    return false;
  }

  const [ledgerEntries, currentOwner, khatianOwner] = await Promise.all([
    listLedgerEntries(parcel._id.toString()),
    findOwnerById(parcel.currentOwnerId.toString()),
    findOwnerById(parcel.khatianOwnerId.toString()),
  ]);

  if (!currentOwner || !khatianOwner) {
    console.error(`FAIL dag ${dag}: an owner reference is missing.`);
    return false;
  }

  const verification = verifyChain(ledgerEntries, parcel.currentOwnerId);
  const report = runRiskEngine({
    parcel: {
      ...parcel,
      currentOwnerName: currentOwner.name,
      khatianOwnerName: khatianOwner.name,
    },
    ledgerEntries,
    verification,
    currentDate: new Date(),
  });
  const actualFindings = report.findings
    .map(({ ruleId }) => ruleId)
    .sort();
  const expectedFindings = [...expected.findings].sort();
  const passed =
    verification.valid &&
    report.score === expected.score &&
    report.band === expected.band &&
    JSON.stringify(actualFindings) === JSON.stringify(expectedFindings);

  console.log(
    `${passed ? "PASS" : "FAIL"} dag ${dag}: score ${report.score} ${report.band}; findings [${actualFindings.join(", ")}]`,
  );
  return passed;
}

async function checkDag18(): Promise<boolean> {
  const parcel = await findParcelByDag(MOUZA_NAME, "18");

  if (!parcel?._id) {
    console.error("FAIL dag 18: parcel is missing.");
    return false;
  }

  const [ledgerEntries, currentOwner, khatianOwner] = await Promise.all([
    listLedgerEntries(parcel._id.toString()),
    findOwnerById(parcel.currentOwnerId.toString()),
    findOwnerById(parcel.khatianOwnerId.toString()),
  ]);

  if (!currentOwner || !khatianOwner) {
    console.error("FAIL dag 18: an owner reference is missing.");
    return false;
  }

  const verification = verifyChain(ledgerEntries, parcel.currentOwnerId);
  const report = runRiskEngine({
    parcel: {
      ...parcel,
      currentOwnerName: currentOwner.name,
      khatianOwnerName: khatianOwner.name,
    },
    ledgerEntries,
    verification,
    currentDate: new Date(),
  });
  const expected: ExpectedRisk = verification.valid
    ? { findings: [], score: 0, band: "LOW" }
    : { findings: ["R6"], score: 50, band: "HIGH" };
  const actualFindings = report.findings
    .map(({ ruleId }) => ruleId)
    .sort();
  const passed =
    (verification.valid || verification.firstBrokenSeq === 2) &&
    report.score === expected.score &&
    report.band === expected.band &&
    JSON.stringify(actualFindings) === JSON.stringify([...expected.findings].sort());

  console.log(
    `${passed ? "PASS" : "FAIL"} dag 18: score ${report.score} ${report.band}; findings [${actualFindings.join(", ")}]; integrity ${verification.valid ? "valid" : `broken at ${verification.firstBrokenSeq}`}`,
  );
  return passed;
}

async function checkAllChains(): Promise<boolean> {
  const parcels = await listParcels();
  let passed = parcels.length === 34;

  if (parcels.length !== 34) {
    console.error(`FAIL parcel count: expected 34, found ${parcels.length}.`);
  }

  for (const parcel of parcels) {
    const entries = await listLedgerEntries(parcel._id!.toString());
    const verification = verifyChain(entries, parcel.currentOwnerId);
    const expectedTamper =
      parcel.dagNumber === "18" &&
      !verification.valid &&
      verification.firstBrokenSeq === 2;
    const validSeedChain =
      verification.valid &&
      entries.length > 0 &&
      entries[0].type === "REGISTRATION";

    if (!validSeedChain && !expectedTamper) {
      console.error(
        `FAIL dag ${parcel.dagNumber}: ${verification.reason ?? "missing REGISTRATION entry"}`,
      );
      passed = false;
    }
  }

  console.log(
    `${passed ? "PASS" : "FAIL"} ledger chains: ${parcels.length} parcels checked (dag 18 tamper is allowed at seq 2).`,
  );
  return passed;
}

async function checkSeed(): Promise<void> {
  await withDatabase(async () => {
    let passedCount = 0;
    let totalCount = 0;

    totalCount += 1;
    if (await checkAllChains()) passedCount += 1;

    for (const [dag, expected] of EXPECTED_RISK) {
      totalCount += 1;
      if (await checkDag(dag, expected)) passedCount += 1;
    }

    totalCount += 1;
    if (await checkDag18()) passedCount += 1;

    if (passedCount !== totalCount) {
      throw new Error(`Seed check failed: ${passedCount}/${totalCount} cases passed.`);
    }

    console.log(`Seed check passed: ${passedCount}/${totalCount} cases.`);
  });
}

await runCli("Seed check", checkSeed);

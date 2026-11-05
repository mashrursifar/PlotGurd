import { Types } from "mongoose";
import { computeEntryHash, type LedgerEntryType } from "../modules/ledger/hash-chain.js";
import type { LedgerEntryRecord } from "../modules/ledger/ledger-entry.model.js";
import type { Owner } from "../modules/owners/owner.model.js";
import type { Parcel, LandType } from "../modules/parcels/parcel.model.js";
import { polygonArea } from "../utils/geometry.js";

export const MOUZA_NAME = "Kalpanapur";
export const DEMO_USER_EMAIL = "demo.user@plotguard.test";
export const SEED_REFERENCE_DATE = new Date("2026-11-05T00:00:00.000Z");
export const SEED_IDS = Object.freeze({
  authority: new Types.ObjectId("6500000000000000000000a1"),
  system: new Types.ObjectId("6500000000000000000000a2"),
  demoUser: new Types.ObjectId("6500000000000000000000a3"),
});

const OWNER_NAMES = [
  "Asha Fern",
  "Biren Willow",
  "Chaya Brook",
  "Dilan Meadow",
  "Esha Vale",
  "Farid Orchard",
  "Gita Lantern",
  "Halim Cedar",
  "Ira Pebble",
  "Jamil Reed",
  "Kavya Harbor",
  "Lina Thicket",
  "Mahir Clover",
  "Nila Summit",
  "Omar Finch",
  "Pia Marigold",
  "Qadir Flint",
  "Rupa Moss",
  "Sami River",
  "Kalpanapur Government Estate",
] as const;

const LAND_TYPE_BY_DAG: readonly LandType[] = Array.from({ length: 34 }, (_, index) => {
  const dag = index + 1;
  if ([1, 15, 28].includes(dag)) return "GOVERNMENT";
  if ([32, 33, 34].includes(dag)) return "WETLAND";
  if ([4, 10, 16, 22].includes(dag)) return "COMMERCIAL";
  if ([2, 5, 8, 11, 14, 17, 20, 23, 26, 29].includes(dag)) return "RESIDENTIAL";
  return "AGRICULTURAL";
});

interface LedgerStep {
  type: LedgerEntryType;
  fromOwnerIndex: number | null;
  toOwnerIndex: number;
  date: Date;
  source: "LIVE" | "LEGACY_IMPORT";
  note: string | null;
}

interface ParcelFixture {
  dag: number;
  steps: LedgerStep[];
  initialOwnerIndex: number;
  khatianOwnerIndex: number;
  disputed?: boolean;
}

function objectId(hex: string): Types.ObjectId {
  return new Types.ObjectId(hex);
}

function parcelId(dag: number): Types.ObjectId {
  return objectId(`6600000000000000000000${dag.toString().padStart(2, "0")}`);
}

function makeOwners(): Owner[] {
  return OWNER_NAMES.map((name, index) => ({
    _id: objectId(`6500000000000000000001${index.toString().padStart(2, "2")}`),
    name,
    nationalId: `990000000${index.toString().padStart(4, "0")}`,
    address:
      index === OWNER_NAMES.length - 1
        ? "Civic Records Office, Kalpanapur"
        : `Fictional Lane ${index + 1}, Kalpanapur`,
  }));
}

function makePolygon(dag: number): [number, number][] {
  const row = Math.floor((dag - 1) / 5);
  const column = (dag - 1) % 5;
  const x = 16 + column * 196;
  const y = 16 + row * 94;
  const width = 166;
  const height = 68;
  const offset = (multiplier: number, modulo: number): number =>
    ((dag * multiplier) % modulo) + 2;

  return [
    [x + offset(3, 8), y + offset(5, 6)],
    [x + width - offset(7, 9), y + offset(11, 7)],
    [x + width - offset(13, 8), y + height - offset(17, 7)],
    [x + offset(19, 7), y + height - offset(23, 8)],
  ];
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function daysBefore(days: number): Date {
  return new Date(SEED_REFERENCE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
}

function makeFixture(dag: number, random: () => number): ParcelFixture {
  const initialOwnerIndex =
    dag === 3 ? 2 : dag === 7 ? 6 : dag === 14 ? 13 : dag === 18 ? 17 : dag === 21 ? 2 : dag % 18;
  const registration: LedgerStep = {
    type: "REGISTRATION",
    fromOwnerIndex: null,
    toOwnerIndex: initialOwnerIndex,
    date: daysBefore(365 * (8 + (dag % 2))),
    source: "LIVE",
    note: null,
  };
  const sale = (
    fromOwnerIndex: number,
    toOwnerIndex: number,
    date: Date,
    source: LedgerStep["source"] = "LIVE",
  ): LedgerStep => ({
    type: "SALE",
    fromOwnerIndex,
    toOwnerIndex,
    date,
    source,
    note: source === "LEGACY_IMPORT" ? "Imported from a fictional legacy register." : null,
  });
  const mutation = (ownerIndex: number, date: Date): LedgerStep => ({
    type: "MUTATION",
    fromOwnerIndex: null,
    toOwnerIndex: ownerIndex,
    date,
    source: "LIVE",
    note: null,
  });

  if (dag === 3) {
    return {
      dag,
      initialOwnerIndex: 2,
      khatianOwnerIndex: 4,
      steps: [
        registration,
        sale(2, 3, daysBefore(365 * 3)),
        sale(3, 4, daysBefore(365 * 2)),
        mutation(4, daysBefore(365 * 2 - 1)),
      ],
    };
  }

  if (dag === 7) {
    return {
      dag,
      initialOwnerIndex: 6,
      khatianOwnerIndex: 9,
      steps: [
        registration,
        sale(6, 7, daysBefore(220)),
        sale(7, 8, daysBefore(100)),
        sale(8, 9, daysBefore(10)),
        mutation(9, daysBefore(9)),
      ],
    };
  }

  if (dag === 14) {
    return {
      dag,
      initialOwnerIndex: 13,
      khatianOwnerIndex: 14,
      steps: [
        registration,
        sale(13, 14, daysBefore(365 * 2)),
        sale(13, 15, daysBefore(365), "LEGACY_IMPORT"),
      ],
    };
  }

  if (dag === 18) {
    return {
      dag,
      initialOwnerIndex: 17,
      khatianOwnerIndex: 18,
      steps: [
        registration,
        sale(17, 18, daysBefore(365 * 2)),
        mutation(18, daysBefore(365 * 2 - 1)),
      ],
    };
  }

  if (dag === 21) {
    return {
      dag,
      initialOwnerIndex: 2,
      khatianOwnerIndex: 2,
      steps: [registration, sale(2, 3, daysBefore(200))],
    };
  }

  const landType = LAND_TYPE_BY_DAG[dag - 1];
  if (landType === "GOVERNMENT") {
    const governmentOwner = OWNER_NAMES.length - 1;
    return {
      dag,
      initialOwnerIndex: governmentOwner,
      khatianOwnerIndex: governmentOwner,
      steps: [registration],
    };
  }

  let currentOwnerIndex = initialOwnerIndex;
  const steps: LedgerStep[] = [registration];
  const transferCount = Math.floor(random() * 3);
  const oldestTransferDays = 365 * (2 + (dag % 6));

  for (let transfer = 0; transfer < transferCount; transfer += 1) {
    const nextOwnerIndex = (initialOwnerIndex + transfer + 1) % 19;
    const transferDate = daysBefore(oldestTransferDays - transfer * 365 * 2);
    steps.push(sale(currentOwnerIndex, nextOwnerIndex, transferDate));
    steps.push(mutation(nextOwnerIndex, new Date(transferDate.getTime() + 24 * 60 * 60 * 1000)));
    currentOwnerIndex = nextOwnerIndex;
  }

  return {
    dag,
    initialOwnerIndex,
    khatianOwnerIndex: currentOwnerIndex,
    steps,
    disputed: dag === 33,
  };
}

function assertNoOverlappingBounds(parcels: readonly Parcel[]): void {
  for (let leftIndex = 0; leftIndex < parcels.length; leftIndex += 1) {
    const left = parcels[leftIndex];
    const leftXs = left.polygon.map(([x]) => x);
    const leftYs = left.polygon.map(([, y]) => y);
    const leftBounds = {
      minX: Math.min(...leftXs),
      maxX: Math.max(...leftXs),
      minY: Math.min(...leftYs),
      maxY: Math.max(...leftYs),
    };

    for (let rightIndex = leftIndex + 1; rightIndex < parcels.length; rightIndex += 1) {
      const right = parcels[rightIndex];
      const rightXs = right.polygon.map(([x]) => x);
      const rightYs = right.polygon.map(([, y]) => y);
      const boundsOverlap =
        leftBounds.minX < Math.max(...rightXs) &&
        leftBounds.maxX > Math.min(...rightXs) &&
        leftBounds.minY < Math.max(...rightYs) &&
        leftBounds.maxY > Math.min(...rightYs);

      if (boundsOverlap) {
        throw new Error(`Seed parcel polygons overlap at dags ${left.dagNumber} and ${right.dagNumber}.`);
      }
    }
  }
}

export interface SeedFixtures {
  owners: Owner[];
  parcels: Parcel[];
  ledgerEntries: LedgerEntryRecord[];
}

export function buildSeedFixtures(areaScale: number): SeedFixtures {
  if (!Number.isFinite(areaScale) || areaScale <= 0) {
    throw new RangeError("AREA_SCALE must be a positive finite number.");
  }

  const owners = makeOwners();
  const random = createRandom(0x504c4f54);
  const fixtures = Array.from({ length: 34 }, (_, index) =>
    makeFixture(index + 1, random),
  );
  const parcels: Parcel[] = [];
  const ledgerEntries: LedgerEntryRecord[] = [];

  for (const fixture of fixtures) {
    const id = parcelId(fixture.dag);
    const polygon = makePolygon(fixture.dag);
    const currentOwner = owners[fixture.steps[fixture.steps.length - 1].toOwnerIndex];
    const khatianOwner = owners[fixture.khatianOwnerIndex];
    const computedArea = polygonArea(polygon) * areaScale;
    const isAreaMismatch = fixture.dag === 29;

    parcels.push({
      _id: id,
      mouza: MOUZA_NAME,
      dagNumber: String(fixture.dag),
      khatianNumber: `K-${String(fixture.dag).padStart(3, "0")}`,
      landType: LAND_TYPE_BY_DAG[fixture.dag - 1],
      recordedAreaDecimal: isAreaMismatch ? computedArea * 0.65 : computedArea,
      polygon,
      currentOwnerId: currentOwner._id!,
      khatianOwnerId: khatianOwner._id!,
      status: "ACTIVE",
      disputeFlag: fixture.disputed ?? false,
      disputeReason: fixture.disputed
        ? "Boundary disagreement between neighbours"
        : null,
    });

    let previousHash = "GENESIS";
    fixture.steps.forEach((step, index) => {
      const entryBase = {
        parcelId: id,
        seq: index + 1,
        type: step.type,
        fromOwnerId:
          step.fromOwnerIndex === null ? null : owners[step.fromOwnerIndex]._id!,
        toOwnerId: owners[step.toOwnerIndex]._id!,
        effectiveDate: step.date,
        performedBy: SEED_IDS.system,
        source: step.source,
        note: step.note,
        prevHash: previousHash,
      };
      const entryHash = computeEntryHash(entryBase);

      ledgerEntries.push({ ...entryBase, entryHash });
      previousHash = entryHash;
    });
  }

  assertNoOverlappingBounds(parcels);
  return { owners, parcels, ledgerEntries };
}

import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { env } from "../config/env.js";
import { insertEnquiries } from "../modules/enquiries/enquiry.repository.js";
import type { Enquiry } from "../modules/enquiries/enquiry.model.js";
import { insertLedgerEntries } from "../modules/ledger/ledger-entry.repository.js";
import { insertOwners } from "../modules/owners/owner.repository.js";
import { insertParcels } from "../modules/parcels/parcel.repository.js";
import { insertUsers } from "../modules/users/user.repository.js";
import type { User } from "../modules/users/user.model.js";
import { buildSeedFixtures, DEMO_USER_EMAIL, SEED_IDS } from "./fixtures.js";
import { getSeedConfig } from "./seed-config.js";
import { withDatabase } from "./database-cli.js";

const BCRYPT_ROUNDS = 12;

function makeEnquiries(): Enquiry[] {
  return [
    {
      parcelId: new Types.ObjectId("660000000000000000000014"),
      userId: SEED_IDS.demoUser,
      question: "Can you explain the ownership entries for this dag?",
      status: "OPEN",
      reply: null,
      repliedBy: null,
      repliedAt: null,
    },
    {
      parcelId: new Types.ObjectId("660000000000000000000021"),
      userId: SEED_IDS.demoUser,
      question: "Has the khatian been updated after the recent transfer?",
      status: "ANSWERED",
      reply: "The record is queued for a mutation review by the authority.",
      repliedBy: SEED_IDS.authority,
      repliedAt: new Date("2026-10-02T12:00:00.000Z"),
    },
    {
      parcelId: new Types.ObjectId("660000000000000000000003"),
      userId: SEED_IDS.demoUser,
      question: "Could you confirm the clean transfer history?",
      status: "CLOSED",
      reply: "The recorded transfer history has been reviewed.",
      repliedBy: SEED_IDS.authority,
      repliedAt: new Date("2026-10-03T12:00:00.000Z"),
    },
  ];
}

export async function seedDatabase(): Promise<void> {
  const config = getSeedConfig();

  await withDatabase(async () => {
    await mongoose.connection.dropDatabase();

    const fixtures = buildSeedFixtures(env.AREA_SCALE);
    const users: User[] = [
      {
        _id: SEED_IDS.authority,
        name: "Demo Authority",
        email: config.authorityEmail,
        passwordHash: await bcrypt.hash(config.authorityPassword, BCRYPT_ROUNDS),
        role: "authority",
      },
      {
        _id: SEED_IDS.system,
        name: "Internal Ledger System",
        email: "system@plotguard.internal",
        passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), BCRYPT_ROUNDS),
        role: "authority",
      },
      {
        _id: SEED_IDS.demoUser,
        name: "Demo User",
        email: DEMO_USER_EMAIL,
        passwordHash: await bcrypt.hash(config.demoUserPassword, BCRYPT_ROUNDS),
        role: "user",
      },
    ];

    await insertUsers(users);
    await insertOwners(fixtures.owners);
    await insertParcels(fixtures.parcels);
    await insertLedgerEntries(fixtures.ledgerEntries);
    await insertEnquiries(makeEnquiries());

    console.log(
      `Seed complete: ${fixtures.parcels.length} parcels, ${fixtures.owners.length} owners, ${fixtures.ledgerEntries.length} ledger entries.`,
    );
  });
}

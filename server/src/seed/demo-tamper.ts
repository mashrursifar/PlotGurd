import { runCli, withDatabase } from "./database-cli.js";
import { findParcelByDag } from "../modules/parcels/parcel.repository.js";
import { LedgerEntryModel } from "../modules/ledger/ledger-entry.model.js";

async function tamperDemoEntry(): Promise<void> {
  await withDatabase(async () => {
    const parcel = await findParcelByDag("Kalpanapur", "18");

    if (!parcel?._id) {
      throw new Error("Dag 18 was not found. Run the seed script first.");
    }

    const result = await LedgerEntryModel.updateOne(
      { parcelId: parcel._id, seq: 2 },
      { $set: { note: "Tampered demo entry; hash intentionally not recomputed." } },
    );

    if (result.matchedCount !== 1) {
      throw new Error("Dag 18 ledger entry 2 was not found.");
    }

    console.log("Tampered dag 18 entry 2. Integrity verification should now fail.");
  });
}

await runCli("Demo tamper", tamperDemoEntry);

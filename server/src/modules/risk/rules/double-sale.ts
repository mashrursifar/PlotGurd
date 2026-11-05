import type { RiskRule } from "../types.js";
import { changesOwnership } from "./helpers.js";

export const evaluateDoubleSale: RiskRule = ({ ledgerEntries }) => {
  const previousSaleBySeller = new Map<
    string,
    (typeof ledgerEntries)[number]
  >();

  for (const entry of ledgerEntries) {
    if (changesOwnership(entry)) {
      for (const [sellerId, previousSale] of previousSaleBySeller) {
        if (entry.toOwnerId.toString() === sellerId && entry.seq > previousSale.seq) {
          previousSaleBySeller.delete(sellerId);
        }
      }
    }

    if (entry.type !== "SALE" || entry.fromOwnerId === null) {
      continue;
    }

    const sellerId = entry.fromOwnerId.toString();
    const previousSale = previousSaleBySeller.get(sellerId);

    if (previousSale) {
      return {
        ruleId: "R1",
        name: "DOUBLE_SALE",
        points: 40,
        severity: "high",
        explanation: "The same seller appears to have sold this plot more than once.",
        evidence: {
          entries: [
            {
              seq: previousSale.seq,
              buyerId: previousSale.toOwnerId.toString(),
              effectiveDate: new Date(previousSale.effectiveDate).toISOString(),
            },
            {
              seq: entry.seq,
              buyerId: entry.toOwnerId.toString(),
              effectiveDate: new Date(entry.effectiveDate).toISOString(),
            },
          ],
          sellerId,
        },
      };
    }

    previousSaleBySeller.set(sellerId, entry);
  }

  return null;
};

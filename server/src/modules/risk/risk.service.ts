import { Types } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { findOwnersByIds } from "../owners/owner.repository.js";
import { findParcelById, findParcelsByIds } from "../parcels/parcel.repository.js";
import { listLedgerEntries } from "../ledger/ledger-entry.repository.js";
import { verifyChain } from "../ledger/hash-chain.js";
import type { RiskAssessment } from "./risk-assessment.model.js";
import {
  findLatestAssessment,
  insertRiskAssessments,
  listAssessmentsForUser,
  listRiskAssessmentPage,
} from "./risk-assessment.repository.js";
import { runRiskEngine } from "./engine.js";
import type { RiskBand, RiskReport } from "./types.js";

export interface RiskAssessmentItem {
  id: string;
  parcelId: string;
  dagNumber: string;
  score: number;
  band: RiskBand;
  findings: RiskAssessment["findings"];
  ruleVersion: string;
  generatedAt: string;
}

export interface PaginatedRiskAssessments {
  items: RiskAssessmentItem[];
  page: number;
  limit: number;
  total: number;
}

function requireId(
  value: Types.ObjectId | undefined,
  recordName: string,
): string {
  if (!value) {
    throw new AppError("INTERNAL_ERROR", 500, `A ${recordName} has no identifier.`);
  }
  return value.toString();
}

function assessmentGeneratedAt(assessment: RiskAssessment): string {
  if (!assessment.createdAt || !Number.isFinite(assessment.createdAt.getTime())) {
    throw new AppError(
      "INTERNAL_ERROR",
      500,
      "A risk assessment has no valid creation date.",
    );
  }
  return assessment.createdAt.toISOString();
}

function toRiskAssessmentItem(
  assessment: RiskAssessment,
  dagNumber: string,
): RiskAssessmentItem {
  return {
    id: requireId(assessment._id, "risk assessment"),
    parcelId: assessment.parcelId.toString(),
    dagNumber,
    score: assessment.score,
    band: assessment.band,
    findings: assessment.findings,
    ruleVersion: assessment.ruleVersion,
    generatedAt: assessmentGeneratedAt(assessment),
  };
}

async function loadDagNumbers(
  assessments: readonly RiskAssessment[],
): Promise<Map<string, string>> {
  const parcelIds = [...new Set(assessments.map((item) => item.parcelId.toString()))];
  if (parcelIds.length === 0) return new Map();

  const parcels = await findParcelsByIds(parcelIds);
  const dagNumbers = new Map(
    parcels.flatMap((parcel) =>
      parcel._id ? [[parcel._id.toString(), parcel.dagNumber] as const] : [],
    ),
  );

  for (const parcelId of parcelIds) {
    if (!dagNumbers.has(parcelId)) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "A parcel for a risk assessment could not be loaded.",
      );
    }
  }
  return dagNumbers;
}

function makeAssessmentItems(
  assessments: readonly RiskAssessment[],
  dagNumbers: ReadonlyMap<string, string>,
): RiskAssessmentItem[] {
  return assessments.map((assessment) => {
    const dagNumber = dagNumbers.get(assessment.parcelId.toString());
    if (!dagNumber) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "A parcel for a risk assessment could not be loaded.",
      );
    }
    return toRiskAssessmentItem(assessment, dagNumber);
  });
}

export async function assessParcelRisk(
  parcelId: string,
  userId: string,
): Promise<RiskReport> {
  const parcel = await findParcelById(parcelId);
  if (!parcel) {
    throw new AppError("NOT_FOUND", 404, "Parcel not found.");
  }
  const storedParcelId = requireId(parcel._id, "parcel");
  const ledgerEntries = await listLedgerEntries(storedParcelId);
  const owners = await findOwnersByIds([
    parcel.currentOwnerId.toString(),
    parcel.khatianOwnerId.toString(),
  ]);
  const ownerNames = new Map(
    owners.flatMap((owner) =>
      owner._id ? [[owner._id.toString(), owner.name] as const] : [],
    ),
  );
  const currentOwnerName = ownerNames.get(parcel.currentOwnerId.toString());
  const khatianOwnerName = ownerNames.get(parcel.khatianOwnerId.toString());

  if (!currentOwnerName || !khatianOwnerName) {
    throw new AppError(
      "INTERNAL_ERROR",
      500,
      "A parcel owner record could not be loaded.",
    );
  }

  const currentDate = new Date();
  const report = runRiskEngine(
    {
      parcel: {
        currentOwnerId: parcel.currentOwnerId,
        currentOwnerName,
        khatianOwnerId: parcel.khatianOwnerId,
        khatianOwnerName,
        recordedAreaDecimal: parcel.recordedAreaDecimal,
        polygon: parcel.polygon,
        disputeFlag: parcel.disputeFlag,
        disputeReason: parcel.disputeReason,
      },
      ledgerEntries,
      verification: verifyChain(ledgerEntries, parcel.currentOwnerId),
      currentDate,
    },
  );

  await insertRiskAssessments([
    {
      parcelId: new Types.ObjectId(storedParcelId),
      userId: new Types.ObjectId(userId),
      score: report.score,
      band: report.band,
      findings: report.findings,
      ruleVersion: report.ruleVersion,
    },
  ]);

  return report;
}

export async function getLatestParcelRiskAssessment(
  parcelId: string,
  userId: string,
): Promise<RiskReport> {
  const assessment = await findLatestAssessment(parcelId, userId);
  if (!assessment) {
    throw new AppError("NOT_FOUND", 404, "Risk assessment not found.");
  }
  return {
    score: assessment.score,
    band: assessment.band,
    findings: assessment.findings,
    ruleVersion: assessment.ruleVersion,
    generatedAt: assessmentGeneratedAt(assessment),
  };
}

export async function getUserRiskAssessments(
  userId: string,
): Promise<RiskAssessmentItem[]> {
  const assessments = await listAssessmentsForUser(userId);
  return makeAssessmentItems(assessments, await loadDagNumbers(assessments));
}

export async function getAllRiskAssessments(
  page: number,
  limit: number,
  band?: RiskBand,
): Promise<PaginatedRiskAssessments> {
  const { assessments, total } = await listRiskAssessmentPage(page, limit, band);
  return {
    items: makeAssessmentItems(assessments, await loadDagNumbers(assessments)),
    page,
    limit,
    total,
  };
}

import {
  RiskAssessmentModel,
  type RiskAssessment,
} from "./risk-assessment.model.js";

export async function insertRiskAssessments(
  assessments: readonly RiskAssessment[],
): Promise<RiskAssessment[]> {
  return RiskAssessmentModel.insertMany(assessments);
}

export async function findLatestAssessment(
  parcelId: string,
  userId: string,
): Promise<RiskAssessment | null> {
  return RiskAssessmentModel.findOne({ parcelId, userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

export async function listAssessmentsForUser(
  userId: string,
): Promise<RiskAssessment[]> {
  return RiskAssessmentModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

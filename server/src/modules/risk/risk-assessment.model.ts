import { model, Schema, Types } from "mongoose";
import type { RiskBand, RiskFinding } from "./types.js";

export interface RiskAssessment {
  _id?: Types.ObjectId;
  parcelId: Types.ObjectId;
  userId: Types.ObjectId;
  score: number;
  band: RiskBand;
  findings: RiskFinding[];
  ruleVersion: string;
}

const riskFindingSchema = new Schema<RiskFinding>(
  {
    ruleId: { type: String, enum: ["R1", "R2", "R3", "R4", "R5", "R6"], required: true },
    name: { type: String, required: true },
    points: { type: Number, required: true, min: 0, max: 100 },
    severity: { type: String, enum: ["medium", "high", "critical"], required: true },
    explanation: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const riskAssessmentSchema = new Schema<RiskAssessment>(
  {
    parcelId: { type: Schema.Types.ObjectId, required: true, ref: "Parcel" },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    score: { type: Number, required: true, min: 0, max: 100, validate: Number.isInteger },
    band: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    findings: { type: [riskFindingSchema], required: true, default: [] },
    ruleVersion: { type: String, required: true },
  },
  { timestamps: true },
);

export const RiskAssessmentModel = model<RiskAssessment>(
  "RiskAssessment",
  riskAssessmentSchema,
);

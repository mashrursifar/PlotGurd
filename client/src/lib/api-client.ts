interface HealthData {
  status: "ok";
  database: "connected" | "connecting" | "disconnected";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "authority";
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type ParcelLandType =
  "AGRICULTURAL" | "RESIDENTIAL" | "COMMERCIAL" | "WETLAND" | "GOVERNMENT";

export type ParcelStatus = "ACTIVE" | "UNDER_REVIEW";

export interface ParcelMapItem {
  id: string;
  dagNumber: string;
  landType: ParcelLandType;
  polygon: [number, number][];
  status: ParcelStatus;
  disputeFlag: boolean;
  ownerName: string;
}

export interface ParcelOwnerSummary {
  id: string;
  name: string;
}

export interface ParcelDetail {
  id: string;
  mouza: string;
  dagNumber: string;
  khatianNumber: string;
  landType: ParcelLandType;
  recordedAreaDecimal: number;
  computedAreaDecimal: number;
  polygon: [number, number][];
  currentOwner: ParcelOwnerSummary;
  khatianOwner: ParcelOwnerSummary;
  status: ParcelStatus;
  disputeFlag: boolean;
  disputeReason: string | null;
}

export type LedgerEntryType =
  "REGISTRATION" | "SALE" | "INHERITANCE" | "GIFT" | "MUTATION" | "CORRECTION";

export interface ParcelHistoryEntry {
  seq: number;
  type: LedgerEntryType;
  fromOwner: string | null;
  toOwner: string;
  effectiveDate: string;
  performedBy: string;
  source: "LIVE" | "LEGACY_IMPORT";
  note: string | null;
  entryHash: string;
}

export interface ChainVerification {
  valid: boolean;
  entriesChecked: number;
  firstBrokenSeq: number | null;
  reason: string | null;
}

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskSeverity = "medium" | "high" | "critical";

export interface RiskFinding {
  ruleId: "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
  name: string;
  points: number;
  severity: RiskSeverity;
  explanation: string;
  evidence: Record<string, unknown>;
}

export interface RiskReport {
  score: number;
  band: RiskBand;
  findings: RiskFinding[];
  ruleVersion: string;
  generatedAt: string;
}

export interface RiskAssessmentItem extends RiskReport {
  id: string;
  parcelId: string;
  dagNumber: string;
}

export interface PaginatedRiskAssessments {
  items: RiskAssessmentItem[];
  page: number;
  limit: number;
  total: number;
}

export type EnquiryStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface EnquiryItem {
  id: string;
  parcelId: string;
  userId: string;
  question: string;
  status: EnquiryStatus;
  reply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface OwnerItem {
  id: string;
  name: string;
  nationalId: string;
  address: string;
}

export interface CreateOwnerInput {
  name: string;
  nationalId: string;
  address: string;
}

export interface CreateParcelInput {
  mouza: string;
  dagNumber: string;
  khatianNumber: string;
  landType: ParcelLandType;
  recordedAreaDecimal: number;
  polygon: [number, number][];
  currentOwnerId: string;
}

export type ParcelUpdateInput = Partial<
  Pick<
    ParcelDetail,
    "khatianNumber" | "landType" | "recordedAreaDecimal" | "polygon" | "status"
  >
>;

export type TransactionType = Exclude<LedgerEntryType, "REGISTRATION">;

export interface ParcelTransactionInput {
  type: TransactionType;
  fromOwnerId: string | null;
  toOwnerId: string;
  effectiveDate: string;
  note?: string | null;
}

export interface RecordedTransaction extends ParcelHistoryEntry {
  source: "LIVE";
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogItem[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestData(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to reach the API. Make sure the server is running and configured.",
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = JSON.parse(await response.text()) as unknown;
  } catch {
    throw new ApiError(
      `The API returned a non-JSON response (HTTP ${response.status}). Check the server terminal for startup errors.`,
      response.status,
      "INVALID_API_RESPONSE",
    );
  }

  if (!isRecord(body) || typeof body.success !== "boolean") {
    throw new Error("The API returned an invalid response.");
  }

  if (!response.ok || body.success !== true) {
    const error = body.error;
    const message =
      isRecord(error) && typeof error.message === "string"
        ? error.message
        : "The API request failed.";
    const code =
      isRecord(error) && typeof error.code === "string"
        ? error.code
        : "INTERNAL_ERROR";
    const details =
      isRecord(error) && Array.isArray(error.details)
        ? error.details.flatMap((detail): ApiErrorDetail[] =>
            isRecord(detail) &&
            typeof detail.path === "string" &&
            typeof detail.message === "string"
              ? [{ path: detail.path, message: detail.message }]
              : [],
          )
        : [];
    throw new ApiError(message, response.status, code, details);
  }

  return body.data;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (value.role === "user" || value.role === "authority")
  );
}

function isHealthData(value: unknown): value is HealthData {
  return (
    isRecord(value) &&
    value.status === "ok" &&
    (value.database === "connected" ||
      value.database === "connecting" ||
      value.database === "disconnected")
  );
}

function isParcelMapItem(value: unknown): value is ParcelMapItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.dagNumber === "string" &&
    (value.landType === "AGRICULTURAL" ||
      value.landType === "RESIDENTIAL" ||
      value.landType === "COMMERCIAL" ||
      value.landType === "WETLAND" ||
      value.landType === "GOVERNMENT") &&
    Array.isArray(value.polygon) &&
    value.polygon.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        point.every(
          (coordinate) =>
            typeof coordinate === "number" && Number.isFinite(coordinate),
        ),
    ) &&
    (value.status === "ACTIVE" || value.status === "UNDER_REVIEW") &&
    typeof value.disputeFlag === "boolean" &&
    typeof value.ownerName === "string"
  );
}

function isParcelOwnerSummary(value: unknown): value is ParcelOwnerSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

function isParcelDetail(value: unknown): value is ParcelDetail {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mouza === "string" &&
    typeof value.dagNumber === "string" &&
    typeof value.khatianNumber === "string" &&
    (value.landType === "AGRICULTURAL" ||
      value.landType === "RESIDENTIAL" ||
      value.landType === "COMMERCIAL" ||
      value.landType === "WETLAND" ||
      value.landType === "GOVERNMENT") &&
    typeof value.recordedAreaDecimal === "number" &&
    Number.isFinite(value.recordedAreaDecimal) &&
    typeof value.computedAreaDecimal === "number" &&
    Number.isFinite(value.computedAreaDecimal) &&
    Array.isArray(value.polygon) &&
    value.polygon.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        point.every(
          (coordinate) =>
            typeof coordinate === "number" && Number.isFinite(coordinate),
        ),
    ) &&
    isParcelOwnerSummary(value.currentOwner) &&
    isParcelOwnerSummary(value.khatianOwner) &&
    (value.status === "ACTIVE" || value.status === "UNDER_REVIEW") &&
    typeof value.disputeFlag === "boolean" &&
    (typeof value.disputeReason === "string" || value.disputeReason === null)
  );
}

function isLedgerEntryType(value: unknown): value is LedgerEntryType {
  return (
    value === "REGISTRATION" ||
    value === "SALE" ||
    value === "INHERITANCE" ||
    value === "GIFT" ||
    value === "MUTATION" ||
    value === "CORRECTION"
  );
}

function isParcelHistoryEntry(value: unknown): value is ParcelHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.seq === "number" &&
    Number.isInteger(value.seq) &&
    value.seq >= 1 &&
    isLedgerEntryType(value.type) &&
    (typeof value.fromOwner === "string" || value.fromOwner === null) &&
    typeof value.toOwner === "string" &&
    typeof value.effectiveDate === "string" &&
    Number.isFinite(Date.parse(value.effectiveDate)) &&
    typeof value.performedBy === "string" &&
    (value.source === "LIVE" || value.source === "LEGACY_IMPORT") &&
    (typeof value.note === "string" || value.note === null) &&
    typeof value.entryHash === "string" &&
    /^[a-f0-9]{64}$/.test(value.entryHash)
  );
}

function isChainVerification(value: unknown): value is ChainVerification {
  return (
    isRecord(value) &&
    typeof value.valid === "boolean" &&
    typeof value.entriesChecked === "number" &&
    Number.isInteger(value.entriesChecked) &&
    value.entriesChecked >= 0 &&
    ((typeof value.firstBrokenSeq === "number" &&
      Number.isInteger(value.firstBrokenSeq) &&
      value.firstBrokenSeq >= 1) ||
      value.firstBrokenSeq === null) &&
    (typeof value.reason === "string" || value.reason === null) &&
    (value.valid
      ? value.firstBrokenSeq === null && value.reason === null
      : value.firstBrokenSeq !== null && value.reason !== null)
  );
}

function isRiskBand(value: unknown): value is RiskBand {
  return (
    value === "LOW" ||
    value === "MEDIUM" ||
    value === "HIGH" ||
    value === "CRITICAL"
  );
}

function isRiskFinding(value: unknown): value is RiskFinding {
  return (
    isRecord(value) &&
    (value.ruleId === "R1" ||
      value.ruleId === "R2" ||
      value.ruleId === "R3" ||
      value.ruleId === "R4" ||
      value.ruleId === "R5" ||
      value.ruleId === "R6") &&
    typeof value.name === "string" &&
    typeof value.points === "number" &&
    Number.isInteger(value.points) &&
    value.points >= 0 &&
    value.points <= 100 &&
    (value.severity === "medium" ||
      value.severity === "high" ||
      value.severity === "critical") &&
    typeof value.explanation === "string" &&
    isRecord(value.evidence)
  );
}

function isRiskReport(value: unknown): value is RiskReport {
  return (
    isRecord(value) &&
    typeof value.score === "number" &&
    Number.isInteger(value.score) &&
    value.score >= 0 &&
    value.score <= 100 &&
    isRiskBand(value.band) &&
    Array.isArray(value.findings) &&
    value.findings.every(isRiskFinding) &&
    typeof value.ruleVersion === "string" &&
    typeof value.generatedAt === "string" &&
    Number.isFinite(Date.parse(value.generatedAt))
  );
}

function isRiskAssessmentItem(value: unknown): value is RiskAssessmentItem {
  return (
    isRiskReport(value) &&
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.parcelId === "string" &&
    typeof value.dagNumber === "string"
  );
}

function isPaginatedRiskAssessments(
  value: unknown,
): value is PaginatedRiskAssessments {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isRiskAssessmentItem) &&
    typeof value.page === "number" &&
    Number.isInteger(value.page) &&
    typeof value.limit === "number" &&
    Number.isInteger(value.limit) &&
    typeof value.total === "number" &&
    Number.isInteger(value.total)
  );
}

function isEnquiryStatus(value: unknown): value is EnquiryStatus {
  return value === "OPEN" || value === "ANSWERED" || value === "CLOSED";
}

function isEnquiryItem(value: unknown): value is EnquiryItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.parcelId === "string" &&
    typeof value.userId === "string" &&
    typeof value.question === "string" &&
    isEnquiryStatus(value.status) &&
    (typeof value.reply === "string" || value.reply === null) &&
    (typeof value.repliedBy === "string" || value.repliedBy === null) &&
    (typeof value.repliedAt === "string" || value.repliedAt === null) &&
    typeof value.createdAt === "string"
  );
}

function isOwnerItem(value: unknown): value is OwnerItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.nationalId === "string" &&
    typeof value.address === "string"
  );
}

function isRecordedTransaction(value: unknown): value is RecordedTransaction {
  return isParcelHistoryEntry(value) && value.source === "LIVE";
}

function isAuditLogItem(value: unknown): value is AuditLogItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.actorId === "string" &&
    typeof value.action === "string" &&
    typeof value.targetType === "string" &&
    typeof value.targetId === "string" &&
    typeof value.summary === "string" &&
    (value.meta === null || isRecord(value.meta)) &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

function isPaginatedAuditLogs(value: unknown): value is PaginatedAuditLogs {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isAuditLogItem) &&
    typeof value.page === "number" &&
    Number.isInteger(value.page) &&
    typeof value.limit === "number" &&
    Number.isInteger(value.limit) &&
    typeof value.total === "number" &&
    Number.isInteger(value.total)
  );
}

export async function getHealth(): Promise<HealthData> {
  const data = await requestData("/api/health");
  if (!isHealthData(data)) {
    throw new Error("The API returned an invalid health response.");
  }
  return data;
}

export async function getParcels(): Promise<ParcelMapItem[]> {
  const data = await requestData("/api/parcels");
  if (!Array.isArray(data) || !data.every(isParcelMapItem)) {
    throw new Error("The API returned an invalid parcel list.");
  }
  return data;
}

export async function getParcelDetail(id: string): Promise<ParcelDetail> {
  const data = await requestData(`/api/parcels/${encodeURIComponent(id)}`);
  if (!isParcelDetail(data)) {
    throw new Error("The API returned an invalid parcel detail.");
  }
  return data;
}

export async function getParcelHistory(
  id: string,
): Promise<ParcelHistoryEntry[]> {
  const data = await requestData(
    `/api/parcels/${encodeURIComponent(id)}/history`,
  );
  if (!Array.isArray(data) || !data.every(isParcelHistoryEntry)) {
    throw new Error("The API returned an invalid parcel history.");
  }
  return data;
}

export async function verifyParcelHistory(
  id: string,
): Promise<ChainVerification> {
  const data = await requestData(
    `/api/parcels/${encodeURIComponent(id)}/history/verify`,
  );
  if (!isChainVerification(data)) {
    throw new Error("The API returned an invalid history verification result.");
  }
  return data;
}

export async function runParcelRiskAssessment(id: string): Promise<RiskReport> {
  const data = await requestData(`/api/parcels/${encodeURIComponent(id)}/risk`, {
    method: "POST",
  });
  if (!isRiskReport(data)) {
    throw new Error("The API returned an invalid risk assessment.");
  }
  return data;
}

export async function getLatestParcelRiskAssessment(
  id: string,
): Promise<RiskReport> {
  const data = await requestData(
    `/api/parcels/${encodeURIComponent(id)}/risk/latest`,
  );
  if (!isRiskReport(data)) {
    throw new Error("The API returned an invalid risk assessment.");
  }
  return data;
}

export async function getMyRiskAssessments(): Promise<RiskAssessmentItem[]> {
  const data = await requestData("/api/risk/mine");
  if (!Array.isArray(data) || !data.every(isRiskAssessmentItem)) {
    throw new Error("The API returned an invalid risk assessment list.");
  }
  return data;
}

export async function getAllRiskAssessments(
  page = 1,
  limit = 20,
  band?: RiskBand,
): Promise<PaginatedRiskAssessments> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (band) query.set("band", band);
  const data = await requestData(`/api/risk/all?${query.toString()}`);
  if (!isPaginatedRiskAssessments(data)) {
    throw new Error("The API returned an invalid risk assessment page.");
  }
  return data;
}

export async function submitEnquiry(
  parcelId: string,
  question: string,
): Promise<EnquiryItem> {
  const data = await requestData("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({ parcelId, question }),
  });
  if (!isEnquiryItem(data)) {
    throw new Error("The API returned an invalid enquiry response.");
  }
  return data;
}

export async function getMyEnquiries(): Promise<EnquiryItem[]> {
  const data = await requestData("/api/enquiries/mine");
  if (!Array.isArray(data) || !data.every(isEnquiryItem)) {
    throw new Error("The API returned an invalid enquiry list.");
  }
  return data;
}

export async function getOwners(name?: string): Promise<OwnerItem[]> {
  const query = new URLSearchParams();
  if (name) query.set("name", name);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const data = await requestData(`/api/owners${suffix}`);
  if (!Array.isArray(data) || !data.every(isOwnerItem)) {
    throw new Error("The API returned an invalid owner list.");
  }
  return data;
}

export async function createOwner(input: CreateOwnerInput): Promise<OwnerItem> {
  const data = await requestData("/api/owners", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isOwnerItem(data)) {
    throw new Error("The API returned an invalid owner response.");
  }
  return data;
}

export async function createParcel(input: CreateParcelInput): Promise<ParcelDetail> {
  const data = await requestData("/api/parcels", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isParcelDetail(data)) {
    throw new Error("The API returned an invalid parcel detail.");
  }
  return data;
}

export async function updateParcel(
  id: string,
  updates: ParcelUpdateInput,
): Promise<ParcelDetail> {
  const data = await requestData(`/api/parcels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!isParcelDetail(data)) {
    throw new Error("The API returned an invalid parcel detail.");
  }
  return data;
}

export async function setParcelDispute(
  id: string,
  disputeFlag: boolean,
  disputeReason: string | null,
): Promise<ParcelDetail> {
  const data = await requestData(
    `/api/parcels/${encodeURIComponent(id)}/dispute`,
    {
      method: "PATCH",
      body: JSON.stringify({ disputeFlag, disputeReason }),
    },
  );
  if (!isParcelDetail(data)) {
    throw new Error("The API returned an invalid parcel detail.");
  }
  return data;
}

export async function recordParcelTransaction(
  id: string,
  input: ParcelTransactionInput,
): Promise<RecordedTransaction> {
  const data = await requestData(
    `/api/parcels/${encodeURIComponent(id)}/transactions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (!isRecordedTransaction(data)) {
    throw new Error("The API returned an invalid transaction response.");
  }
  return data;
}

export async function getAuditLogs(
  page = 1,
  limit = 20,
  filters: { action?: string; target?: string } = {},
): Promise<PaginatedAuditLogs> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.action) query.set("action", filters.action);
  if (filters.target) query.set("target", filters.target);
  const data = await requestData(`/api/audit?${query.toString()}`);
  if (!isPaginatedAuditLogs(data)) {
    throw new Error("The API returned an invalid audit log page.");
  }
  return data;
}

export async function signupUser(input: SignupInput): Promise<AuthUser> {
  const data = await requestData("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isAuthUser(data)) {
    throw new Error("The API returned an invalid user response.");
  }
  return data;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const data = await requestData("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isAuthUser(data)) {
    throw new Error("The API returned an invalid user response.");
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  await requestData("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await requestData("/api/auth/me");
    if (!isAuthUser(data)) {
      throw new Error("The API returned an invalid user response.");
    }
    return data;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

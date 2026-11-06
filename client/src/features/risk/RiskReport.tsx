import { useEffect, useState } from "react";
import type { RiskBand, RiskFinding, RiskReport, RiskSeverity } from "../../lib/api-client";

const BAND_LABELS: Record<RiskBand, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const BAND_CLASSES: Record<RiskBand, string> = {
  LOW: "bg-[var(--risk-low-soft)] text-[var(--risk-low-text)]",
  MEDIUM: "bg-[var(--risk-medium-soft)] text-[var(--risk-medium-text)]",
  HIGH: "bg-[var(--risk-high-soft)] text-[var(--risk-high-text)]",
  CRITICAL: "bg-[var(--risk-critical-soft)] text-[var(--risk-critical-text)]",
};

const BAND_COLORS: Record<RiskBand, string> = {
  LOW: "var(--risk-low)",
  MEDIUM: "var(--risk-medium)",
  HIGH: "var(--risk-high)",
  CRITICAL: "var(--risk-critical)",
};

const SEVERITY_CLASSES: Record<RiskSeverity, { border: string; pill: string }> = {
  medium: {
    border: "border-l-[var(--risk-medium)]",
    pill: "bg-[var(--risk-medium-soft)] text-[var(--risk-medium-text)]",
  },
  high: {
    border: "border-l-[var(--risk-high)]",
    pill: "bg-[var(--risk-high-soft)] text-[var(--risk-high-text)]",
  },
  critical: {
    border: "border-l-[var(--risk-critical)]",
    pill: "bg-[var(--risk-critical-soft)] text-[var(--risk-critical-text)]",
  },
};

export function RiskBandBadge({ band }: { band: RiskBand }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${BAND_CLASSES[band]}`}
    >
      {BAND_LABELS[band]}
    </span>
  );
}

function RiskScoreGauge({ score, band }: Pick<RiskReport, "score" | "band">) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const arcLength = Math.PI * 90;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimatedScore(score));
    return () => window.cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <svg
        aria-label={`Risk score ${score} out of 100`}
        className="w-full max-w-64 overflow-visible"
        role="img"
        viewBox="0 0 220 140"
      >
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke="var(--border)"
          strokeLinecap="round"
          strokeWidth="16"
        />
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke={BAND_COLORS[band]}
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - animatedScore / 100)}
          strokeLinecap="round"
          strokeWidth="16"
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
        <text
          className="fill-foreground font-heading text-[44px] font-bold"
          textAnchor="middle"
          x="110"
          y="103"
        >
          {score}
        </text>
      </svg>
      <RiskBandBadge band={band} />
    </div>
  );
}

function RiskFindingCard({
  finding,
  index,
}: {
  finding: RiskFinding;
  index: number;
}) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <article
      className={`risk-finding-enter rounded-lg border border-border border-l-4 bg-card p-4 shadow-card ${SEVERITY_CLASSES[finding.severity].border}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold text-foreground">
            {finding.name.replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {finding.ruleId}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${SEVERITY_CLASSES[finding.severity].pill}`}
        >
          +{finding.points}
        </span>
      </div>
      <p className="mt-3 text-sm text-foreground">{finding.explanation}</p>
      <button
        aria-expanded={showEvidence}
        className="mt-3 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        onClick={() => setShowEvidence((current) => !current)}
        type="button"
      >
        {showEvidence ? "Hide evidence" : "Show evidence"}
      </button>
      {showEvidence && (
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
          {JSON.stringify(finding.evidence, null, 2)}
        </pre>
      )}
    </article>
  );
}

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RiskReportView({ report }: { report: RiskReport }) {
  return (
    <section aria-label="Risk assessment report" className="space-y-4">
      <RiskScoreGauge band={report.band} score={report.score} />
      <p className="text-center text-xs text-muted-foreground">
        Assessed {formatGeneratedAt(report.generatedAt)}
      </p>
      {report.findings.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No risk rules were triggered for this parcel.
        </p>
      ) : (
        <div aria-label="Risk findings" className="space-y-3">
          {report.findings.map((finding, index) => (
            <RiskFindingCard
              finding={finding}
              index={index}
              key={finding.ruleId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

import { AlertTriangle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getParcelDetail, type ParcelMapItem } from "../../lib/api-client";
import { HistoryTab } from "./HistoryTab";
import { RiskTab } from "../risk/RiskTab";
import { EnquiryTab } from "../enquiries/EnquiryTab";

interface ParcelPanelProps {
  parcel: Pick<ParcelMapItem, "id" | "dagNumber">;
  onClose: () => void;
}

const LAND_TYPE_LABELS = {
  AGRICULTURAL: "Agricultural",
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  WETLAND: "Wetland",
  GOVERNMENT: "Government",
} as const;

const LAND_TYPE_COLORS = {
  AGRICULTURAL: "var(--land-agricultural)",
  RESIDENTIAL: "var(--land-residential)",
  COMMERCIAL: "var(--land-commercial)",
  WETLAND: "var(--land-wetland)",
  GOVERNMENT: "var(--land-government)",
} as const;

function formatArea(value: number): string {
  return `${Number(value.toFixed(2))} decimals`;
}

export function ParcelPanel({ parcel, onClose }: ParcelPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "history" | "risk" | "enquire">(
    "details",
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const detailQuery = useQuery({
    queryKey: ["parcel", parcel.id],
    queryFn: () => getParcelDetail(parcel.id),
  });

  useEffect(() => {
    setActiveTab("details");
  }, [parcel.id]);

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const tabs = ["details", "history", "risk", "enquire"] as const;
    const currentIndex = tabs.indexOf(activeTab);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    setActiveTab(tabs[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <aside
      aria-label={`Details for dag ${parcel.dagNumber}`}
      className="absolute inset-x-0 bottom-0 z-[600] flex max-h-[75vh] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-panel sm:inset-x-3 sm:bottom-3 sm:max-h-[78vh] md:inset-y-4 md:left-auto md:right-4 md:w-[360px] md:rounded-lg xl:inset-y-0 xl:right-0 xl:w-[400px] xl:rounded-none"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">
            Dag <span className="font-mono">{parcel.dagNumber}</span>
            {detailQuery.data && ` · Khatian ${detailQuery.data.khatianNumber}`}
          </h1>
          {detailQuery.data && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {detailQuery.data.status.replace("_", " ")}
              </span>
              {detailQuery.data.disputeFlag && (
                <span className="inline-flex items-center gap-1 rounded-full bg-map-dispute px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <AlertTriangle aria-hidden="true" size={14} />
                  Disputed
                </span>
              )}
            </div>
          )}
        </div>
        <button
          aria-label="Close parcel details"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div
        aria-label="Parcel information"
        className="flex border-b border-border px-4"
        onKeyDown={handleTabKeyDown}
        role="tablist"
      >
        {(["details", "history", "risk", "enquire"] as const).map((tab, index) => (
          <button
            aria-controls={`parcel-${tab}-panel`}
            aria-selected={activeTab === tab}
            className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-semibold capitalize ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted"
            }`}
            id={`parcel-${tab}-tab`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === "details" && (
          <div
            aria-labelledby="parcel-details-tab"
            id="parcel-details-panel"
            role="tabpanel"
            tabIndex={0}
          >
            {detailQuery.isPending && (
              <div aria-label="Loading parcel details" className="space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-5 w-full animate-pulse rounded bg-muted" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            )}
            {detailQuery.isError && (
              <section aria-live="polite">
                <p className="text-sm text-destructive" role="alert">
                  {detailQuery.error.message}
                </p>
                <button
                  className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                  onClick={() => void detailQuery.refetch()}
                  type="button"
                >
                  Try again
                </button>
              </section>
            )}
            {detailQuery.data && (
              <div className="space-y-5">
                <section aria-labelledby="parcel-owners-heading">
                  <h2
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    id="parcel-owners-heading"
                  >
                    Ownership
                  </h2>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Current owner</dt>
                      <dd className="mt-1 font-semibold">
                        {detailQuery.data.currentOwner.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Khatian owner</dt>
                      <dd className="mt-1 font-semibold">
                        {detailQuery.data.khatianOwner.name}
                      </dd>
                    </div>
                  </dl>
                  {detailQuery.data.currentOwner.id !==
                    detailQuery.data.khatianOwner.id && (
                    <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
                      The current owner and khatian owner do not match.
                    </p>
                  )}
                </section>

                <section aria-labelledby="parcel-record-heading">
                  <h2
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    id="parcel-record-heading"
                  >
                    Record details
                  </h2>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Land type</dt>
                      <dd className="mt-1 inline-flex items-center gap-2 font-semibold">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 rounded-sm"
                          style={{
                            backgroundColor:
                              LAND_TYPE_COLORS[detailQuery.data.landType],
                          }}
                        />
                        {LAND_TYPE_LABELS[detailQuery.data.landType]}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Mouza</dt>
                      <dd className="mt-1 font-semibold">
                        {detailQuery.data.mouza}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Recorded area</dt>
                      <dd className="mt-1 font-semibold">
                        {formatArea(detailQuery.data.recordedAreaDecimal)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Map area</dt>
                      <dd className="mt-1 font-semibold">
                        {formatArea(detailQuery.data.computedAreaDecimal)}
                      </dd>
                    </div>
                  </dl>
                </section>

                {detailQuery.data.disputeReason && (
                  <section aria-labelledby="parcel-dispute-heading">
                    <h2
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      id="parcel-dispute-heading"
                    >
                      Dispute reason
                    </h2>
                    <p className="mt-2 text-sm">
                      {detailQuery.data.disputeReason}
                    </p>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "history" && (
          <div
            aria-labelledby="parcel-history-tab"
            id="parcel-history-panel"
            role="tabpanel"
            tabIndex={0}
          >
            <HistoryTab parcelId={parcel.id} />
          </div>
        )}
        {activeTab === "risk" && (
          <div
            aria-labelledby="parcel-risk-tab"
            id="parcel-risk-panel"
            role="tabpanel"
            tabIndex={0}
          >
            <RiskTab parcelId={parcel.id} />
          </div>
        )}
        {activeTab === "enquire" && (
          <div
            aria-labelledby="parcel-enquire-tab"
            id="parcel-enquire-panel"
            role="tabpanel"
            tabIndex={0}
          >
            <EnquiryTab parcelId={parcel.id} />
          </div>
        )}
      </div>
    </aside>
  );
}

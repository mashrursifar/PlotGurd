import { useQuery } from "@tanstack/react-query";
import { CRS, type LatLngBoundsExpression } from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, useMap, useMapEvents } from "react-leaflet";
import { useSearchParams } from "react-router-dom";
import { getParcels } from "../../lib/api-client";
import { Legend } from "./Legend";
import { MapDecorations } from "./MapDecorations";
import { ParcelPanel } from "./ParcelPanel";
import { ParcelLayer } from "./ParcelLayer";
import { SearchBox } from "./SearchBox";
import { toLeafletPositions } from "./map-coordinates";

const MAP_BOUNDS: LatLngBoundsExpression = [
  [0, 0],
  [700, 1000],
];

function FitSelectedParcel({
  parcel,
}: {
  parcel: { polygon: [number, number][] } | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    if (!parcel) return;
    map.fitBounds(
      toLeafletPositions(parcel.polygon),
      { animate: true, duration: 0.4, maxZoom: 0.5, padding: [40, 40] },
    );
  }, [map, parcel]);

  return null;
}

function ClearSelectionOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear });
  return null;
}

export function MapPage() {
  const parcelsQuery = useQuery({
    queryKey: ["parcels"],
    queryFn: getParcels,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDag = searchParams.get("dag");

  if (parcelsQuery.isPending) {
    return (
      <main
        aria-label="Loading parcel map"
        className="flex h-[calc(100dvh-3.5rem)] min-h-96 items-center justify-center bg-map-background"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </main>
    );
  }

  if (parcelsQuery.isError) {
    return (
      <main className="flex h-[calc(100dvh-3.5rem)] min-h-96 items-center justify-center bg-map-background p-6">
        <section
          aria-live="polite"
          className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-card"
        >
          <h1 className="font-heading text-xl font-semibold">Map unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground" role="alert">
            {parcelsQuery.error.message}
          </p>
          <button
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            onClick={() => void parcelsQuery.refetch()}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (parcelsQuery.data.length === 0) {
    return (
      <main className="flex h-[calc(100dvh-3.5rem)] min-h-96 items-center justify-center bg-map-background p-6">
        <section className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
          <h1 className="font-heading text-xl font-semibold">No parcels found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no parcels available to display.
          </p>
        </section>
      </main>
    );
  }

  const selectedParcel = parcelsQuery.data.find(
    (parcel) => parcel.dagNumber === selectedDag,
  );

  function selectDag(dagNumber: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("dag", dagNumber);
      return next;
    });
  }

  function clearSelection(): void {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("dag");
        return next;
      },
      { replace: true },
    );
  }

  return (
    <main className="relative h-[calc(100dvh-3.5rem)] min-h-96 overflow-hidden">
      <div
        className={`absolute inset-0 ${selectedParcel ? "xl:right-[400px]" : ""}`}
      >
        <MapContainer
          bounds={MAP_BOUNDS}
          boundsOptions={{ padding: [12, 12], animate: true, duration: 0.4 }}
          className="h-full w-full bg-map-background"
          crs={CRS.Simple}
          maxZoom={2}
          minZoom={-2}
          zoomControl={false}
          zoomSnap={0.25}
        >
          <FitSelectedParcel parcel={selectedParcel} />
          <ClearSelectionOnMapClick onClear={clearSelection} />
          <MapDecorations />
          <ParcelLayer
            onSelect={selectDag}
            parcels={parcelsQuery.data}
            selectedDag={selectedDag}
          />
        </MapContainer>
      </div>
      <SearchBox
        onClear={clearSelection}
        onSelect={selectDag}
        parcels={parcelsQuery.data}
        selectedDag={selectedDag}
      />
      <Legend />
      {selectedParcel && (
        <ParcelPanel onClose={clearSelection} parcel={selectedParcel} />
      )}
    </main>
  );
}

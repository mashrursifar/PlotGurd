import type { PathOptions } from "leaflet";
import { useState } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import type { ParcelMapItem } from "../../lib/api-client";
import { toLeafletPositions } from "./map-coordinates";

const LAND_TYPE_STYLES: Record<ParcelMapItem["landType"], PathOptions> = {
  AGRICULTURAL: {
    color: "var(--land-agricultural-stroke)",
    fillColor: "var(--land-agricultural)",
    fillOpacity: 0.6,
    weight: 1.5,
  },
  RESIDENTIAL: {
    color: "var(--land-residential-stroke)",
    fillColor: "var(--land-residential)",
    fillOpacity: 0.6,
    weight: 1.5,
  },
  COMMERCIAL: {
    color: "var(--land-commercial-stroke)",
    fillColor: "var(--land-commercial)",
    fillOpacity: 0.6,
    weight: 1.5,
  },
  WETLAND: {
    color: "var(--land-wetland-stroke)",
    fillColor: "var(--land-wetland)",
    fillOpacity: 0.6,
    weight: 1.5,
  },
  GOVERNMENT: {
    color: "var(--land-government-stroke)",
    fillColor: "var(--land-government)",
    fillOpacity: 0.6,
    weight: 1.5,
  },
};

interface ParcelLayerProps {
  parcels: readonly ParcelMapItem[];
  selectedDag: string | null;
  onSelect: (dagNumber: string) => void;
}

export function ParcelLayer({
  parcels,
  selectedDag,
  onSelect,
}: ParcelLayerProps) {
  const [hoveredDag, setHoveredDag] = useState<string | null>(null);

  return (
    <>
      {parcels.map((parcel) => {
        const isSelected = parcel.dagNumber === selectedDag;
        const isHovered = parcel.dagNumber === hoveredDag;
        const positions = toLeafletPositions(parcel.polygon);
        const baseStyle = LAND_TYPE_STYLES[parcel.landType];
        const normalStyle: PathOptions = {
          ...baseStyle,
          color: parcel.disputeFlag
            ? "var(--map-dispute)"
            : baseStyle.color,
          dashArray: parcel.disputeFlag ? "8 6" : undefined,
          fillOpacity: isHovered ? 0.75 : 0.6,
          weight: parcel.disputeFlag ? 3 : 1.5,
        };

        return (
          <Polygon
            bubblingMouseEvents={false}
            eventHandlers={{
              click: () => onSelect(parcel.dagNumber),
              mouseout: () => setHoveredDag(null),
              mouseover: () => setHoveredDag(parcel.dagNumber),
            }}
            key={parcel.id}
            pathOptions={normalStyle}
            positions={positions}
          >
            {isSelected && (
              <Polygon
                interactive={false}
                pathOptions={{
                  ...baseStyle,
                  color: "var(--primary)",
                  dashArray: undefined,
                  fillOpacity: 0.85,
                  weight: 6,
                }}
                positions={positions}
              />
            )}
            {isSelected && (
              <Polygon
                interactive={false}
                pathOptions={{
                  ...baseStyle,
                  color: "var(--accent)",
                  dashArray: undefined,
                  fillOpacity: 0.85,
                  weight: 3,
                }}
                positions={positions}
              />
            )}
            <Tooltip className="parcel-label" direction="center" permanent>
              Dag {parcel.dagNumber}
              {parcel.disputeFlag && (
                <span aria-label="Disputed" className="parcel-dispute-badge">
                  !
                </span>
              )}
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}

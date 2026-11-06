import type { ParcelMapItem } from "../../lib/api-client";

const LAND_TYPES: {
  type: ParcelMapItem["landType"];
  label: string;
  color: string;
}[] = [
  {
    type: "AGRICULTURAL",
    label: "Agricultural",
    color: "var(--land-agricultural)",
  },
  {
    type: "RESIDENTIAL",
    label: "Residential",
    color: "var(--land-residential)",
  },
  {
    type: "COMMERCIAL",
    label: "Commercial",
    color: "var(--land-commercial)",
  },
  { type: "WETLAND", label: "Wetland", color: "var(--land-wetland)" },
  {
    type: "GOVERNMENT",
    label: "Government",
    color: "var(--land-government)",
  },
];

export function Legend() {
  return (
    <aside
      aria-label="Land type legend"
      className="absolute bottom-4 left-4 z-[500] rounded-lg border border-border bg-card p-3 text-xs shadow-card"
    >
      <h2 className="mb-2 font-semibold">Land type</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
        {LAND_TYPES.map(({ type, label, color }) => (
          <li className="flex items-center gap-2 whitespace-nowrap" key={type}>
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-sm border border-foreground/30"
              style={{ backgroundColor: color }}
            />
            {label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

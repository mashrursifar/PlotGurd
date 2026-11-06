import { Pane, Polyline } from "react-leaflet";
import { toLeafletPositions } from "./map-coordinates";

const RIVER: [number, number][] = [
  [972, 270],
  [958, 355],
  [978, 445],
  [960, 545],
  [986, 700],
];

const MAIN_ROAD: [number, number][] = [
  [0, 356],
  [200, 355],
  [400, 357],
  [600, 355],
  [800, 357],
  [1000, 356],
];

const LOCAL_ROADS: [number, number][][] = [
  [[0, 92], [200, 91], [400, 93], [600, 91], [800, 93], [1000, 92]],
  [[0, 180], [200, 179], [400, 181], [600, 179], [800, 181], [1000, 180]],
  [[0, 268], [200, 267], [400, 269], [600, 267], [800, 269], [1000, 268]],
  [[0, 444], [200, 443], [400, 445], [600, 443], [800, 445], [1000, 444]],
  [[0, 532], [200, 531], [400, 533], [600, 531], [800, 533], [1000, 532]],
];

const VERTICAL_ROADS: [number, number][][] = [
  [[195, 0], [194, 175], [196, 350], [194, 525], [195, 700]],
  [[385, 0], [384, 175], [386, 350], [384, 525], [385, 700]],
  [[575, 0], [574, 175], [576, 350], [574, 525], [575, 700]],
  [[765, 0], [764, 175], [766, 350], [764, 525], [765, 700]],
];

function Road({
  positions,
  main = false,
}: {
  positions: [number, number][];
  main?: boolean;
}) {
  const casingWidth = main ? 14 : 9;
  const roadWidth = main ? 10 : 5;

  return (
    <>
      <Polyline
        pathOptions={{
          color: "var(--map-road-casing)",
          lineCap: "round",
          lineJoin: "round",
          weight: casingWidth,
        }}
        positions={toLeafletPositions(positions)}
      />
      <Polyline
        pathOptions={{
          color: "var(--map-road)",
          lineCap: "round",
          lineJoin: "round",
          weight: roadWidth,
        }}
        positions={toLeafletPositions(positions)}
      />
    </>
  );
}

export function MapDecorations() {
  return (
    <Pane name="map-decorations" style={{ zIndex: 350, pointerEvents: "none" }}>
      <Polyline
        pathOptions={{
          color: "var(--map-river-edge)",
          lineCap: "round",
          lineJoin: "round",
          weight: 24,
        }}
        positions={toLeafletPositions(RIVER)}
      />
      <Polyline
        pathOptions={{
          color: "var(--map-river)",
          lineCap: "round",
          lineJoin: "round",
          weight: 18,
        }}
        positions={toLeafletPositions(RIVER)}
      />
      {LOCAL_ROADS.map((positions, index) => (
        <Road key={`horizontal-${index}`} positions={positions} />
      ))}
      {VERTICAL_ROADS.map((positions, index) => (
        <Road key={`vertical-${index}`} positions={positions} />
      ))}
      <Road main positions={MAIN_ROAD} />
    </Pane>
  );
}

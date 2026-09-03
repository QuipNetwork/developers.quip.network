// Regenerates src/data/world-land.ts: the world land outline as one SVG path,
// Miller-projected, cropped, simplified, and cut at the antimeridian.
//
// Run from the repo root:
//   npm i --no-save d3-geo@3 d3-geo-projection@4 topojson-client@3 topojson-simplify@3 world-atlas@2.0.2
//   node scripts/make-world-land.mjs [minWeight]
//
// Why d3-geo and not a hand-rolled projector: rings that cross the antimeridian
// (Russia, Fiji) must be cut into pieces that each close along the map edge.
// A naive split leaves the pieces open, and the SVG `Z` then closes each one
// with a straight line across the continent, which painted a white wedge from
// Chukotka to the Caspian. d3-geo's clipping does the cut correctly.
//
// The projection constants below must match `projectMiller` in the generated
// file, which is what places the node markers. Change them together.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoPath } from "d3-geo";
import { geoMiller } from "d3-geo-projection";
import { feature } from "topojson-client";
import { filter, filterWeight, presimplify, simplify } from "topojson-simplify";

const require = createRequire(import.meta.url);

const WIDTH = 720;
const LAT_N = 80;
const LAT_S = -56;
const R = WIDTH / (2 * Math.PI);
const millerY = (latDeg) =>
  1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * ((latDeg * Math.PI) / 180))) * R;
const yTop = millerY(LAT_N);
const HEIGHT = yTop - millerY(LAT_S);

// Simplification threshold in the topology's own units (square degrees).
// 0.1 keeps ~65 rings at ~32 KB; 0.2 drops to ~51 rings at ~25 KB.
const minWeight = Number(process.argv[2] ?? 0.1);

let topo = JSON.parse(
  require("node:fs").readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"),
);
topo = presimplify(topo);
topo = simplify(topo, minWeight);
topo = filter(topo, filterWeight(topo, minWeight * 20));
const land = feature(topo, topo.objects.land);

const projection = geoMiller()
  .scale(R)
  .translate([WIDTH / 2, yTop])
  .precision(0.2)
  .clipExtent([
    [0, 0],
    [WIDTH, HEIGHT],
  ]);
const d = geoPath(projection).digits(1)(land);
const rings = d.split("M").length - 1;

const file = `/*
 * World land outline as one SVG path, self-hosted and baked by
 * scripts/make-world-land.mjs. Do not edit by hand; re-run the script.
 *
 * Source: world-atlas@2.0.2 \`countries-110m.json\`, \`land\` object (merged
 * coastline), simplified with topojson-simplify (min weight ${minWeight} sq deg),
 * projected MILLER CYLINDRICAL by d3-geo-projection. ${rings} rings, ~${Math.round(d.length / 1024)} KB.
 *
 * Miller rather than equirectangular: equirectangular stretches the high
 * latitudes badly and the map reads warped at the top and bottom. Miller is a
 * standard compromise, has a closed form, and looks like a normal world map.
 *
 * Rings that cross the antimeridian (Russia, Fiji) are cut by d3-geo so that
 * each piece closes along the map edge. An earlier hand-rolled split left the
 * pieces open, and \`Z\` then closed them with a straight line across Asia.
 *
 * Cropped to ${LAT_S}..${LAT_N} degrees latitude, which removes Antarctica and the
 * empty polar ocean. Nobody runs a node there.
 *
 * Self-hosted on purpose: the upstream dashboard fetches this from unpkg at
 * runtime, which is one blocked request away from an empty map.
 *
 * Public domain via Natural Earth, redistributed by world-atlas under ISC.
 */

export const WORLD = {
  width: ${WIDTH.toFixed(1)},
  height: ${HEIGHT.toFixed(2)},
  latN: ${LAT_N.toFixed(1)},
  latS: ${LAT_S.toFixed(1)},
  /** Miller radius: width / 2pi. */
  R: ${R.toFixed(4)},
  /** Projected y of the northern crop edge, so y can be offset to 0. */
  yTop: ${yTop.toFixed(4)},
} as const;

export const WORLD_VIEWBOX = \`0 0 \${WORLD.width} \${WORLD.height}\`;

/** Miller cylindrical, matching the projection baked into the path below. */
export function projectMiller(lat: number, lng: number) {
  const phi = (Math.max(Math.min(lat, 89.5), -89.5) * Math.PI) / 180;
  const y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * phi)) * WORLD.R;
  return {
    x: ((lng + 180) / 360) * WORLD.width,
    y: WORLD.yTop - y,
  };
}

export const WORLD_LAND_PATH =
  "${d}";
`;

const out = process.env.OUT ?? new URL("../src/data/world-land.ts", import.meta.url);
writeFileSync(out, file);
console.log(`wrote ${out}: ${rings} rings, ${d.length} path bytes, minWeight ${minWeight}`);

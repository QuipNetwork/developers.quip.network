/*
 * SAMPLE node placements for the map. These are NOT measurements.
 *
 * No miner on the testnet publishes a `telemetryNodeAddress`, so no real
 * coordinates exist to plot — not for us and not for the protocol team. This set
 * exists to show how the map BEHAVES at a few hundred nodes: how regional
 * clustering reads at world zoom, what a 40-node cluster looks like next to a
 * singleton, and what hovering either one shows.
 *
 * Shaped like real infrastructure, not spread evenly:
 *   - metros are actual datacentre regions, not random coordinates
 *   - counts follow a rough power law, so a handful of metros hold most nodes
 *   - a long tail of one- and two-node metros, which is where clustering and
 *     marker legibility actually get tested
 * An even spread would hide every problem this is meant to surface.
 *
 * Anything rendering these MUST label them as sample. When operators publish a
 * host, replace with the geo-enriched `nodes` array from `GET /api/telemetry`,
 * which already carries { country, city, lat, lng } per node.
 */

export type NodeKind = "CPU" | "GPU" | "QPU";

export interface SampleNode {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  kind: NodeKind;
  /** Peak throughput the node advertises. QPUs report an equivalent figure. */
  tflops: number;
  version: string;
}

/*
 * Metro, country, lat, lng, node count, hardware mix.
 * Quantum hardware only appears where it plausibly would: a few research-heavy
 * metros, never in the long tail.
 */
const METROS: [string, string, number, number, number, NodeKind[]][] = [
  ["Frankfurt", "DE", 50.11, 8.68, 42, ["GPU", "CPU", "GPU", "QPU"]],
  ["Ashburn", "US", 39.04, -77.49, 38, ["CPU", "GPU", "GPU"]],
  ["Singapore", "SG", 1.35, 103.82, 26, ["GPU", "CPU"]],
  ["Tokyo", "JP", 35.68, 139.69, 22, ["QPU", "GPU", "CPU"]],
  ["London", "GB", 51.51, -0.13, 19, ["CPU", "GPU", "QPU"]],
  ["Amsterdam", "NL", 52.37, 4.9, 16, ["GPU", "CPU"]],
  ["San Jose", "US", 37.34, -121.89, 14, ["QPU", "GPU", "GPU"]],
  ["Dublin", "IE", 53.35, -6.26, 11, ["CPU", "GPU"]],
  ["Mumbai", "IN", 19.08, 72.88, 10, ["CPU", "GPU"]],
  ["Seoul", "KR", 37.57, 126.98, 9, ["GPU", "CPU"]],
  ["Sydney", "AU", -33.87, 151.21, 8, ["CPU", "GPU"]],
  ["Paris", "FR", 48.86, 2.35, 8, ["GPU", "CPU"]],
  ["Toronto", "CA", 43.65, -79.38, 7, ["CPU", "GPU"]],
  ["Chicago", "US", 41.88, -87.63, 7, ["CPU", "GPU"]],
  ["Sao Paulo", "BR", -23.55, -46.63, 6, ["CPU", "GPU"]],
  ["Stockholm", "SE", 59.33, 18.07, 5, ["GPU", "CPU"]],
  ["Dallas", "US", 32.78, -96.8, 5, ["CPU", "GPU"]],
  ["Hong Kong", "HK", 22.32, 114.17, 5, ["GPU", "CPU"]],
  ["Osaka", "JP", 34.69, 135.5, 4, ["GPU", "CPU"]],
  ["Bengaluru", "IN", 12.97, 77.59, 4, ["CPU"]],
  ["Warsaw", "PL", 52.23, 21.01, 3, ["CPU"]],
  ["Milan", "IT", 45.46, 9.19, 3, ["CPU", "GPU"]],
  ["Madrid", "ES", 40.42, -3.7, 3, ["CPU"]],
  ["Seattle", "US", 47.61, -122.33, 3, ["GPU", "CPU"]],
  ["Atlanta", "US", 33.75, -84.39, 3, ["CPU"]],
  ["Tel Aviv", "IL", 32.08, 34.78, 2, ["QPU", "GPU"]],
  ["Dubai", "AE", 25.2, 55.27, 2, ["CPU"]],
  ["Jakarta", "ID", -6.21, 106.85, 2, ["CPU"]],
  ["Taipei", "TW", 25.03, 121.57, 2, ["GPU"]],
  ["Johannesburg", "ZA", -26.2, 28.05, 2, ["CPU"]],
  ["Montreal", "CA", 45.5, -73.57, 1, ["GPU"]],
  ["Santiago", "CL", -33.45, -70.67, 1, ["CPU"]],
  ["Lagos", "NG", 6.52, 3.38, 1, ["CPU"]],
  ["Nairobi", "KE", -1.29, 36.82, 1, ["CPU"]],
  ["Queretaro", "MX", 20.59, -100.39, 1, ["CPU"]],
];

/* Deterministic offsets so co-located nodes are distinct points rather than one
 * marker stacked on itself. Same output every render — no Math.random. */
const jitter = (i: number) => ({
  dLat: (((i * 37) % 17) - 8) * 0.06,
  dLng: (((i * 53) % 19) - 9) * 0.08,
});

const slug = (city: string) => city.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function throughput(kind: NodeKind, i: number): number {
  if (kind === "QPU") return Math.round((4.2 + (i % 4) * 1.7) * 10) / 10;
  if (kind === "GPU") return Math.round((38 + (i % 5) * 11) * 10) / 10;
  return Math.round((1.1 + (i % 3) * 0.4) * 10) / 10;
}

let seq = 0;
export const SAMPLE_NODES: SampleNode[] = METROS.flatMap(
  ([city, country, lat, lng, count, mix]) =>
    Array.from({ length: count }, (_, i) => {
      const { dLat, dLng } = jitter(seq++);
      const kind = mix[i % mix.length];
      return {
        name: `${slug(city)}-${String(i + 1).padStart(2, "0")}`,
        city,
        country,
        lat: lat + dLat,
        lng: lng + dLng,
        kind,
        tflops: throughput(kind, i),
        // A realistic minority lag a release behind.
        version: i % 7 === 3 ? "0.1.9" : "0.2.0",
      };
    }),
);

export const SAMPLE_METRO_COUNT = METROS.length;

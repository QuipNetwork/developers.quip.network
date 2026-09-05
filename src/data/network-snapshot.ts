/*
 * A dated snapshot of network-scale figures that the portal cannot read on its
 * own.
 *
 * Everything here is a REAL measurement, not invented sample data. It was read
 * on 2026-08-26 from a local run of the dashboard indexer (dashboard.quip.network)
 * pointed at the public testnet bootnode, with Postgres behind it.
 *
 * Why a snapshot: these figures come from the indexer's Postgres, not from the
 * chain RPC. The portal is a static site and can reach the public RPC directly,
 * but it cannot reach an indexer that nobody is hosting yet. When a public
 * telemetry API exists, delete this file and read `GET /api/telemetry` instead —
 * every field below maps one-to-one onto that response.
 *
 *   chainMiners.length          -> miners
 *   chainMiners w/ proofsWon>0  -> minersWithWins
 *   validators.length           -> validators
 *   mineableTopologies[0]       -> topologyNodes / topologyEdges
 *
 * Label it as a snapshot wherever it renders. A stale number presented as live
 * is worse than no number.
 */

/*
 * ⚠ THIS MEASURES THE RETIRED CHAIN. The network was reset on 2026-09-02 and
 * these figures were read a week before that, so they describe a chain that no
 * longer exists — not the aglais network the live readout above them reports
 * on. The `chain` field is rendered in the badge so the two blocks cannot be
 * mistaken for readings of the same thing.
 *
 * Re-measure against aglais, or delete this block and the component that
 * renders it. Do not simply re-date it.
 */
export const NETWORK_SNAPSHOT = {
  chain: "Retired chain",
  takenOn: "2026-08-26",
  source: "dashboard indexer, retired pre-reset testnet bootnode",
  miners: 11896,
  minersWithWins: 229,
  validators: 3,
  topologyNodes: 4577,
  topologyEdges: 41515,
} as const;

/*
 * SAMPLE placements for the compact node map. These are NOT measurements.
 *
 * No miner on the testnet publishes a `telemetryNodeAddress`, so no real
 * coordinates exist to plot — not for us and not for the protocol team. These
 * five cities are the upstream dashboard's own fixture set
 * (apps/frontend/src/testing/sample-telemetry.ts), reused so the placeholder is
 * at least a known reference rather than something invented here.
 *
 * Anything rendering these MUST label them as sample. When operators start
 * publishing a host, replace this with the geo-enriched `nodes` array from
 * `GET /api/telemetry`, which already carries { country, city, lat, lng }.
 */
export const SAMPLE_NODE_PLACEMENTS = [
  { city: "San Francisco", country: "US", lat: 37.77, lng: -122.42 },
  { city: "London", country: "GB", lat: 51.51, lng: -0.13 },
  { city: "Frankfurt", country: "DE", lat: 50.11, lng: 8.68 },
  { city: "Singapore", country: "SG", lat: 1.35, lng: 103.82 },
  { city: "Tokyo", country: "JP", lat: 35.68, lng: 139.69 },
] as const;

/*
 * Why the real map is empty. The dashboard's world map resolves
 * markers by geo-IP on each miner's published `telemetryNodeAddress`, and zero
 * of the 11,896 miners publish one — so the real map is empty for everyone
 * today, including the protocol team. Inventing coordinates for a developer
 * portal is not worth the credibility cost. Revisit when operators publish a
 * public host.
 */

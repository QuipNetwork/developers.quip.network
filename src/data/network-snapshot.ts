/*
 * A dated snapshot of network-scale figures, read straight from chain storage.
 *
 * Everything here is a REAL measurement, not invented sample data.
 *
 * REFRESHING THESE IS ONE COMMAND: `node scripts/recount-network.mjs`, which
 * prints this exact block. It takes about ten seconds.
 *
 * That matters, because the previous version of this file sat unrefreshed
 * across a whole network reset on the belief that the numbers required standing
 * up the dashboard indexer and its Postgres. They never did — all of them are
 * in chain storage, reachable through the public bootnode RPC under the `safe`
 * method set:
 *
 *   QuantumPow::Miners                  key count            -> miners
 *   QuantumPow::Miners                  proofs_won > 0       -> minersWithWins
 *   Session::Validators                 vec length           -> validators
 *   QuantumPow::RegisteredTopologies[DefaultTopology]        -> topologyNodes
 *                                       nodes/edges lengths     topologyEdges
 *
 * ⚠ Take the topology from `DefaultTopology`, NOT from `MineableTopologies[0]`.
 * The old figures used index 0, which is storage-hash order and therefore
 * arbitrary. There are currently two mineable topologies differing by a single
 * edge, and index 0 is not the default one — that is where the previous
 * 41,515 came from.
 *
 * Still a snapshot rather than a live read: counting every miner key costs far
 * more requests than the 12-second status poll, and it would grow with the
 * network. Label it as a snapshot wherever it renders, and keep `chain` and
 * `atBlock` next to the numbers — a stale figure presented as live is worse
 * than no figure.
 */
export const NETWORK_SNAPSHOT = {
  chain: "Aglais",
  takenOn: "2026-09-06",
  atBlock: 56410,
  source: "chain storage, read directly from a public bootnode RPC",
  miners: 42,
  minersWithWins: 18,
  validators: 3,
  topologyNodes: 4577,
  topologyEdges: 41514,
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

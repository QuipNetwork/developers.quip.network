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

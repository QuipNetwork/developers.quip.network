/*
 * Mirrored from apps/agls/src/data/testnet.ts, which is the source of truth and
 * already publishes these values on a live public site.
 *
 * Mirrored rather than imported because apps are sibling workspaces, not
 * dependencies of each other. If a third surface needs these values, move the
 * file into packages/shared and have both apps import it from there.
 *
 * Only the publicly-published fields are copied. Contract addresses, signature
 * slot numbers, and QVRF interface signatures are embargoed and belong nowhere
 * on this site.
 */

export const EVM = {
  chainName: "Aglais Testnet (Quip Network)",
  chainId: 20033,
  chainIdHex: "0x4e41",
  rpcUrl: "https://evm-rpc.testnet.quip.network:20049",
  currencySymbol: "AGLS",
  decimals: 18,
};

export const CHAIN = {
  network: "quip-testnet",
  tokenSymbol: "AGLS",
  tokenDecimals: 12,
  localRpc: "ws://127.0.0.1:9944",
};

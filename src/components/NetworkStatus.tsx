import { useSyncExternalStore } from "react";
import { PersonaIcon } from "@design/components/PersonaIcon";
import { CHAIN } from "../data/testnet";

/*
 * Live testnet state, read straight from a public Substrate JSON-RPC in the
 * browser. All three bootnodes serve `access-control-allow-origin: *`, so this
 * needs no proxy, no server and no backend of any kind.
 *
 * Read-only calls only: system_chain, system_version, system_health,
 * chain_getHeader and chain_getBlockHash. QuantumPow::QBlockCount is
 * deliberately not read yet — it needs the exact twox128 storage key, and
 * guessing one would silently render a wrong number.
 *
 * Three things this file has to get right, all learned the hard way:
 *
 * 1. GENESIS IS CHECKED BEFORE ANY READING IS TRUSTED. Until 2026-09-05 this
 *    component pointed at a host that still resolved and still answered — but
 *    served the retired chain. Every number on screen was real, and all of them
 *    were about the wrong network. Chain ID cannot catch that (20033 is shared)
 *    and neither can the spec id (still "quip_testnet"). Only genesis can, so a
 *    mismatch halts polling rather than rendering a plausible wrong height.
 * 2. ONE POLLER, N SUBSCRIBERS. NetworkPulse and NetworkReadout are both
 *    mounted on the page. With per-component state they ran two independent
 *    intervals and disagreed with each other by up to six seconds.
 * 3. FAILOVER, AND SPREAD THE LOAD. The start index is random per page load so
 *    bootnode-1 does not absorb every visitor, and a failed cycle advances to
 *    the next node before retrying.
 */

const POLL_MS = 12_000;
const TIMEOUT_MS = 6_000;

const ENDPOINTS = CHAIN.rpcHttp;

interface Health {
  peers: number;
  isSyncing: boolean;
}

interface Snapshot {
  chain: string;
  version: string;
  peers: number;
  isSyncing: boolean;
  blockHeight: number;
  finalizedHeight: number;
}

type State =
  | { status: "loading" }
  | { status: "ok"; data: Snapshot; at: Date }
  | { status: "error"; message: string }
  | { status: "wrong-chain"; endpoint: string; actual: string };

async function rpc<T>(
  url: string,
  method: string,
  signal: AbortSignal,
  params: unknown[] = [],
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const body = (await res.json()) as {
    result?: T;
    error?: { message: string };
  };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  if (body.result === undefined) throw new Error(`${method}: empty result`);
  return body.result;
}

/* ---- module-level store: one poller, however many components subscribe ---- */

let state: State = { status: "loading" };
const listeners = new Set<() => void>();

let endpointIndex = Math.floor(Math.random() * ENDPOINTS.length);
let intervalId: ReturnType<typeof setInterval> | undefined;
let inflight: AbortController | undefined;
/** Endpoints whose genesis matched. Re-checked per host, not once globally. */
const verified = new Set<string>();
/** system_chain and system_version only move on a runtime upgrade. */
const staticInfo = new Map<string, { chain: string; version: string }>();

function publish(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

async function cycle() {
  // A wrong-chain verdict is terminal: never poll past it, never overwrite it.
  if (state.status === "wrong-chain") return;

  const url = ENDPOINTS[endpointIndex]!;
  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (!verified.has(url)) {
      const genesis = await rpc<string>(
        url,
        "chain_getBlockHash",
        controller.signal,
        [0],
      );
      if (genesis !== CHAIN.genesis) {
        publish({ status: "wrong-chain", endpoint: url, actual: genesis });
        stopPolling();
        return;
      }
      verified.add(url);
    }

    let info = staticInfo.get(url);
    if (!info) {
      const [chain, version] = await Promise.all([
        rpc<string>(url, "system_chain", controller.signal),
        rpc<string>(url, "system_version", controller.signal),
      ]);
      info = { chain, version };
      staticInfo.set(url, info);
    }

    const [health, header, finalizedHash] = await Promise.all([
      rpc<Health>(url, "system_health", controller.signal),
      rpc<{ number: string }>(url, "chain_getHeader", controller.signal),
      rpc<string>(url, "chain_getFinalizedHead", controller.signal),
    ]);
    // Finalized head comes back as a hash, so its height needs a second hop.
    const finalizedHeader = await rpc<{ number: string }>(
      url,
      "chain_getHeader",
      controller.signal,
      [finalizedHash],
    );

    publish({
      status: "ok",
      at: new Date(),
      data: {
        chain: info.chain,
        version: info.version,
        peers: health.peers,
        isSyncing: health.isSyncing,
        blockHeight: Number.parseInt(header.number, 16),
        finalizedHeight: Number.parseInt(finalizedHeader.number, 16),
      },
    });
  } catch (err) {
    // This node just failed us; try the next one on the following cycle.
    endpointIndex = (endpointIndex + 1) % ENDPOINTS.length;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "timed out"
        : err instanceof Error
          ? err.message
          : "unreachable";
    // Keep the last good reading on screen rather than blanking it.
    if (state.status !== "ok") publish({ status: "error", message });
  } finally {
    clearTimeout(timer);
  }
}

const onVisible = () => {
  if (!document.hidden) void cycle();
};

function startPolling() {
  if (intervalId !== undefined) return;
  void cycle();
  intervalId = setInterval(() => {
    if (!document.hidden) void cycle();
  }, POLL_MS);
  document.addEventListener("visibilitychange", onVisible);
}

function stopPolling() {
  clearInterval(intervalId);
  intervalId = undefined;
  document.removeEventListener("visibilitychange", onVisible);
  inflight?.abort();
  inflight = undefined;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) startPolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopPolling();
  };
}

const LOADING: State = { status: "loading" };

function useNetwork() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}

/*
 * The state indicator is the brand's Node glyph, not a status dot. A green
 * circle is the generic default for "online" and says nothing; the plus is the
 * design system's own mark for infrastructure, so the thing on screen is
 * literally the symbol for the nodes whose health it reports.
 */
const TONE = {
  live: "text-[#047857]",
  syncing: "text-[#9a5b00]",
  down: "text-(--color-accent-text)",
  idle: "text-(--color-zinc-300)",
} as const;

function toneFor(state: State) {
  if (state.status === "loading") return TONE.idle;
  if (state.status === "error" || state.status === "wrong-chain")
    return TONE.down;
  return state.data.isSyncing ? TONE.syncing : TONE.live;
}

function StateGlyph({ state }: { state: State }) {
  return (
    <span aria-hidden="true" className={`inline-flex ${toneFor(state)}`}>
      <PersonaIcon shape="plus" />
    </span>
  );
}

function labelFor(state: State) {
  if (state.status === "loading") return "Checking";
  if (state.status === "error") return "Unreachable";
  if (state.status === "wrong-chain") return "Wrong chain";
  return state.data.isSyncing ? "Syncing" : "Live";
}

/** One line for the masthead status strip. */
export function NetworkPulse() {
  const state = useNetwork();
  return (
    <>
      <div className="flex items-baseline gap-2">
        <span className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
          Network
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StateGlyph state={state} />
          <span className="[font-family:var(--font-mono)] text-[12px] leading-[1.4] font-medium text-zinc-950">
            {labelFor(state)}
          </span>
        </span>
      </div>
      {state.status === "ok" && (
        <div className="flex items-baseline gap-2">
          <span className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
            Blocks produced
          </span>
          <span className="[font-family:var(--font-mono)] text-[12px] leading-[1.4] font-medium text-zinc-950 tabular-nums">
            {state.data.blockHeight.toLocaleString("en-US")}
          </span>
        </div>
      )}
    </>
  );
}

/** Full readout for the Testnet panel. */
export function NetworkReadout() {
  const state = useNetwork();

  const rows: { label: string; value: string }[] =
    state.status === "ok"
      ? [
          { label: "Chain", value: state.data.chain },
          {
            label: "Blocks produced",
            value: state.data.blockHeight.toLocaleString("en-US"),
          },
          {
            label: "Finalized",
            value: state.data.finalizedHeight.toLocaleString("en-US"),
          },
          { label: "Peers", value: String(state.data.peers) },
          { label: "Syncing", value: state.data.isSyncing ? "yes" : "no" },
          { label: "Node version", value: state.data.version },
        ]
      : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2.5">
        <span className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
          Live status
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StateGlyph state={state} />
          <span className="[font-family:var(--font-mono)] text-[11.5px] leading-none font-medium text-zinc-950">
            {labelFor(state)}
          </span>
        </span>
        {state.status === "ok" && (
          <span className="ml-auto [font-family:var(--font-mono)] text-[10.5px] leading-none text-(--color-muted)">
            {state.at.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

      {state.status === "wrong-chain" ? (
        <p className="m-0 text-[12px] leading-[1.45] text-(--color-accent-text)">
          {state.endpoint} answered with genesis {state.actual.slice(0, 10)}…,
          which is not this network. Readings are withheld rather than shown for
          the wrong chain.
        </p>
      ) : state.status === "error" ? (
        <p className="m-0 text-[12px] leading-[1.45] text-(--color-muted)">
          Could not reach the public RPC ({state.message}). These are testnet
          bootnodes, so this can happen during upgrades; the next poll tries a
          different one.
        </p>
      ) : (
        <dl className="m-0 grid grid-cols-2 gap-x-6 max-md:grid-cols-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-t border-(--color-border) py-1.5"
            >
              <dt className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
                {row.label}
              </dt>
              <dd className="m-0 [font-family:var(--font-mono)] text-[12px] leading-[1.4] text-zinc-950 tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
          {state.status === "loading" &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-t border-(--color-border) py-1.5"
              >
                <span className="h-[8px] w-16 bg-(--color-surface-2)" />
                <span className="h-[8px] w-20 bg-(--color-surface-2)" />
              </div>
            ))}
        </dl>
      )}

      <p className="m-0 text-[11px] leading-[1.45] text-(--color-muted)">
        Read live in your browser from the public bootnode RPC, genesis-checked
        against this network. No account, no node, nothing to install.
      </p>
    </div>
  );
}

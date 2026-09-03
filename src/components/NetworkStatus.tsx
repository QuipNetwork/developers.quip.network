import { useCallback, useEffect, useRef, useState } from "react";
import { PersonaIcon } from "@design/components/PersonaIcon";
import { NETWORK } from "../data/links";

/*
 * Live testnet state, read straight from a public Substrate JSON-RPC in the
 * browser. The endpoint serves `access-control-allow-origin: *`, so this needs
 * no proxy, no server and no backend of any kind.
 *
 * Read-only calls only: system_chain, system_version, system_health and
 * chain_getHeader. QuantumPow::QBlockCount is deliberately not read yet — it
 * needs the exact twox128 storage key, and guessing one would silently render a
 * wrong number.
 *
 * See the note on NETWORK.rpcPublic: the endpoint is not yet documented by the
 * protocol team, so this is demo-grade until they confirm it.
 */

const POLL_MS = 12_000;
const TIMEOUT_MS = 6_000;

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
  | { status: "error"; message: string };

async function rpc<T>(
  method: string,
  signal: AbortSignal,
  params: unknown[] = [],
): Promise<T> {
  const res = await fetch(NETWORK.rpcPublic, {
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

async function readSnapshot(signal: AbortSignal): Promise<Snapshot> {
  const [chain, version, health, header, finalizedHash] = await Promise.all([
    rpc<string>("system_chain", signal),
    rpc<string>("system_version", signal),
    rpc<Health>("system_health", signal),
    rpc<{ number: string }>("chain_getHeader", signal),
    rpc<string>("chain_getFinalizedHead", signal),
  ]);
  // Finalized head comes back as a hash, so its height needs a second hop.
  const finalizedHeader = await rpc<{ number: string }>(
    "chain_getHeader",
    signal,
    [finalizedHash],
  );
  return {
    chain,
    version,
    peers: health.peers,
    isSyncing: health.isSyncing,
    blockHeight: Number.parseInt(header.number, 16),
    finalizedHeight: Number.parseInt(finalizedHeader.number, 16),
  };
}

function useNetwork() {
  const [state, setState] = useState<State>({ status: "loading" });
  const inflight = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const data = await readSnapshot(controller.signal);
      setState({ status: "ok", data, at: new Date() });
    } catch (err) {
      if (controller.signal.aborted && !(err instanceof DOMException)) return;
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "timed out"
          : err instanceof Error
            ? err.message
            : "unreachable";
      // Keep the last good reading on screen rather than blanking it.
      setState((prev) =>
        prev.status === "ok" ? prev : { status: "error", message },
      );
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      inflight.current?.abort();
    };
  }, [load]);

  return state;
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
  if (state.status === "error") return TONE.down;
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

      {state.status === "error" ? (
        <p className="m-0 text-[12px] leading-[1.45] text-(--color-muted)">
          Could not reach the public RPC ({state.message}). The endpoint is a
          testnet bootnode, so this can happen during upgrades.
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
        Read live in your browser from the public bootnode RPC. No account, no
        node, nothing to install.
      </p>
    </div>
  );
}

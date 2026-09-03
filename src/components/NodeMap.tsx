import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  WORLD,
  WORLD_LAND_PATH,
  WORLD_VIEWBOX,
  projectMiller,
} from "../data/world-land";
import {
  SAMPLE_METRO_COUNT,
  SAMPLE_NODES,
  type NodeKind,
  type SampleNode,
} from "../data/sample-nodes";

/*
 * Node map with regional clustering and hover detail.
 *
 * At world zoom a datacentre region is a few pixels across, so one marker per
 * node would stack forty markers on one spot and misstate density. Nodes within
 * CLUSTER_RADIUS collapse into one marker sized by count on a log scale.
 *
 * Two consequences of clustering at a few hundred nodes, both handled here:
 *
 *  1. Neighbouring metros merge. Frankfurt, Amsterdam and Paris land inside one
 *     radius, so a cluster is often multi-city and the tooltip must not claim a
 *     single one. Multi-city clusters get a per-city breakdown instead.
 *  2. The tooltip has to stay inside the frame. It is measured and clamped
 *     against the container, and flips below the marker when there is no room
 *     above, rather than relying on a percentage guess.
 *
 * Corners stay sharp, markers are the brand diamond, and there is no glow.
 * Placements are SAMPLE data: see sample-nodes.ts.
 */

const CLUSTER_RADIUS = 13;
const TIP_GAP = 10;
const EDGE_PAD = 6;

interface Cluster {
  x: number;
  y: number;
  nodes: SampleNode[];
}

function clusterNodes(nodes: SampleNode[]): Cluster[] {
  const out: Cluster[] = [];
  for (const n of nodes) {
    const p = projectMiller(n.lat, n.lng);
    const hit = out.find(
      (c) => Math.hypot(c.x - p.x, c.y - p.y) <= CLUSTER_RADIUS,
    );
    if (hit) {
      hit.nodes.push(n);
      const pts = hit.nodes.map((m) => projectMiller(m.lat, m.lng));
      hit.x = pts.reduce((s, q) => s + q.x, 0) / pts.length;
      hit.y = pts.reduce((s, q) => s + q.y, 0) / pts.length;
    } else {
      out.push({ x: p.x, y: p.y, nodes: [n] });
    }
  }
  // Biggest first, so small markers paint on top and stay reachable.
  return out.sort((a, b) => b.nodes.length - a.nodes.length);
}

/** Half-diagonal of the marker. Log scale so 40 nodes is not 40x wide. */
const markerSize = (count: number) => 4 + Math.log10(1 + count) * 5.6;

const KIND_LABEL: Record<NodeKind, string> = {
  QPU: "Quantum",
  GPU: "GPU",
  CPU: "CPU",
};

function summarise(nodes: SampleNode[]) {
  const byKind: Record<NodeKind, number> = { QPU: 0, GPU: 0, CPU: 0 };
  const byCity = new Map<string, number>();
  let tflops = 0;
  for (const n of nodes) {
    byKind[n.kind] += 1;
    tflops += n.tflops;
    const key = `${n.city}, ${n.country}`;
    byCity.set(key, (byCity.get(key) ?? 0) + 1);
  }
  return {
    byKind,
    tflops: Math.round(tflops),
    cities: [...byCity.entries()].sort((a, b) => b[1] - a[1]),
  };
}

function Diamond({
  r,
  ...rest
}: { r: number } & React.SVGProps<SVGRectElement>) {
  return (
    <rect
      x={-r}
      y={-r}
      width={r * 2}
      height={r * 2}
      transform="rotate(45)"
      {...rest}
    />
  );
}

const LABEL =
  "[font-family:var(--font-mono)] font-features-['case'] text-[9.5px] leading-none font-medium tracking-[0.4px] uppercase";

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={`${LABEL} text-zinc-500`}>{k}</dt>
      <dd className="m-0 [font-family:var(--font-mono)] text-[11px] text-zinc-200 tabular-nums">
        {v}
      </dd>
    </div>
  );
}

export function NodeMap() {
  const clusters = useMemo(() => clusterNodes(SAMPLE_NODES), []);
  const [active, setActive] = useState<number | null>(null);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState({ left: 0, top: 0, ready: false });

  const cluster = active === null ? null : clusters[active];
  const detail = useMemo(
    () => (cluster ? summarise(cluster.nodes) : null),
    [cluster],
  );

  /*
   * Place the tooltip in container pixels: centre it on the marker, clamp both
   * axes inside the frame, and flip below the marker when it will not fit above.
   * Measured rather than guessed, so it cannot escape the frame at any size.
   */
  const place = useCallback(() => {
    const frame = frameRef.current;
    const tipEl = tipRef.current;
    if (!frame || !tipEl || !cluster) return;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const tw = tipEl.offsetWidth;
    const th = tipEl.offsetHeight;

    const mx = (cluster.x / WORLD.width) * fw;
    const my = (cluster.y / WORLD.height) * fh;

    const left = Math.min(Math.max(mx - tw / 2, EDGE_PAD), fw - tw - EDGE_PAD);
    const above = my - TIP_GAP - th;
    const top =
      above >= EDGE_PAD
        ? above
        : Math.min(my + TIP_GAP + 8, fh - th - EDGE_PAD);

    setTip({ left, top, ready: true });
  }, [cluster]);

  useLayoutEffect(() => {
    if (!cluster) {
      setTip((t) => (t.ready ? { ...t, ready: false } : t));
      return;
    }
    place();
  }, [cluster, place]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={frameRef}
        className="relative overflow-hidden border border-(--color-border) bg-(--color-zinc-50)"
      >
        <div className="pointer-events-none absolute top-0 left-0 z-10 flex flex-wrap items-center gap-2 p-2.5">
          <span className={`${LABEL} text-[10px] text-zinc-950`}>Node map</span>
          <span
            className={`${LABEL} border border-(--color-border) bg-(--color-bg) px-1.5 py-0.5 text-(--color-text-subtle)`}
          >
            Dummy locations
          </span>
        </div>

        <svg
          viewBox={WORLD_VIEWBOX}
          className="block h-auto w-full"
          role="img"
          aria-label={`World map: ${SAMPLE_NODES.length} sample nodes across ${SAMPLE_METRO_COUNT} locations, grouped into ${clusters.length} clusters`}
        >
          <path
            d={WORLD_LAND_PATH}
            fill="var(--color-surface-2)"
            stroke="var(--color-border)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />

          {clusters.map((c, i) => {
            const n = c.nodes.length;
            const r = markerSize(n);
            const on = active === i;
            return (
              <g
                key={`${c.x.toFixed(1)}-${c.y.toFixed(1)}`}
                transform={`translate(${c.x} ${c.y})`}
                tabIndex={0}
                role="button"
                aria-label={`${n} node${n === 1 ? "" : "s"}, ${summarise(c.nodes).cities[0][0]}`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() =>
                  setActive((cur) => (cur === i ? null : cur))
                }
                onFocus={() => setActive(i)}
                onBlur={() => setActive((cur) => (cur === i ? null : cur))}
              >
                <Diamond r={Math.max(r + 4, 10)} fill="transparent" />
                <Diamond
                  r={r + 3}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={on ? 1.4 : 0.85}
                  opacity={on ? 0.9 : 0.35}
                />
                <Diamond
                  r={r}
                  fill="var(--color-accent)"
                  stroke="var(--color-zinc-50)"
                  strokeWidth="0.8"
                />
                {/* Only label markers wide enough to hold the digits. */}
                {n > 1 && r >= 7.6 && (
                  <text
                    y="2.5"
                    textAnchor="middle"
                    className="[font-family:var(--font-mono)] font-medium"
                    fontSize={n >= 100 ? 6.6 : 7.4}
                    fill="var(--color-zinc-50)"
                  >
                    {n}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute right-0 bottom-0 flex items-center gap-2.5 p-2.5">
          <span className={`${LABEL} text-(--color-muted)`}>Cluster size</span>
          {[1, 10, 40].map((n) => (
            <span key={n} className="flex items-center gap-1">
              <svg
                width="18"
                height="18"
                viewBox="-9 -9 18 18"
                aria-hidden="true"
              >
                <Diamond r={markerSize(n)} fill="var(--color-accent)" />
              </svg>
              <span className="[font-family:var(--font-mono)] text-[9.5px] leading-none text-(--color-muted) tabular-nums">
                {n}
              </span>
            </span>
          ))}
        </div>

        {cluster && detail && (
          <div
            ref={tipRef}
            className="pointer-events-none absolute z-20 w-[224px] border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-50 shadow-[0_4px_14px_rgba(9,9,11,0.22)]"
            style={{
              left: `${tip.left}px`,
              top: `${tip.top}px`,
              visibility: tip.ready ? "visible" : "hidden",
            }}
          >
            {cluster.nodes.length === 1 ? (
              <>
                <div className="[font-family:var(--font-mono)] text-[11.5px] leading-tight font-medium">
                  {cluster.nodes[0].name}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight text-zinc-400">
                  {detail.cities[0][0]}
                </div>
                <dl className="mt-2 flex flex-col gap-1 border-t border-zinc-700 pt-2">
                  <Row k="Type" v={KIND_LABEL[cluster.nodes[0].kind]} />
                  <Row k="Throughput" v={`${cluster.nodes[0].tflops} TFLOPS`} />
                  <Row k="Version" v={cluster.nodes[0].version} />
                </dl>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="[font-family:var(--font-mono)] text-[15px] leading-none font-medium tabular-nums">
                    {cluster.nodes.length}
                  </span>
                  <span className="text-[11px] leading-none text-zinc-300">
                    nodes
                  </span>
                  {detail.cities.length > 1 && (
                    <span className="ml-auto text-[10.5px] leading-none text-zinc-500">
                      {detail.cities.length} locations
                    </span>
                  )}
                </div>

                <dl className="mt-2 flex flex-col gap-1 border-t border-zinc-700 pt-2">
                  {detail.cities.slice(0, 4).map(([city, count]) => (
                    <Row key={city} k={city} v={count} />
                  ))}
                  {detail.cities.length > 4 && (
                    <div className={`${LABEL} text-zinc-500`}>
                      +{detail.cities.length - 4} more
                    </div>
                  )}
                </dl>

                <dl className="mt-2 flex flex-col gap-1 border-t border-zinc-700 pt-2">
                  {(["QPU", "GPU", "CPU"] as NodeKind[])
                    .filter((k) => detail.byKind[k] > 0)
                    .map((k) => (
                      <Row key={k} k={KIND_LABEL[k]} v={detail.byKind[k]} />
                    ))}
                  <Row k="Combined" v={`${detail.tflops} TFLOPS`} />
                </dl>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scope the claim. Two of this panel's three blocks are real, so the
          caption has to say which one is not rather than casting doubt on all. */}
      <p className="m-0 text-[11px] leading-[1.45] text-(--color-muted)">
        <strong className="font-medium text-(--color-text-subtle)">
          Map positions are dummy data.
        </strong>{" "}
        {SAMPLE_NODES.length} placeholder nodes across {SAMPLE_METRO_COUNT}{" "}
        locations, in {clusters.length} clusters at this zoom. The live chain
        status above and the measured figures below are real. Positions fill in
        for real once operators publish a host, which none do yet.
      </p>
    </div>
  );
}

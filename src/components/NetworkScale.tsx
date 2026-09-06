import { NETWORK_SNAPSHOT as S } from "../data/network-snapshot";

/*
 * Network-scale figures, read from chain storage and rendered as a clearly-dated
 * snapshot. See src/data/network-snapshot.ts for how to refresh them — it is one
 * command, not a project.
 *
 * The ratio below is stated without a verdict attached, on purpose. An earlier
 * version editorialised it as "mining is hard, most miners have never won",
 * which was fair at 229 of 11,896 on the pre-reset chain but inverts completely
 * on aglais, where 18 of 42 have won. Any sentence that interprets the number
 * has to be rewritten every time the number moves, and will eventually be
 * rewritten a release too late. Report it; let the reader draw the conclusion.
 */

const won = S.minersWithWins / S.miners;

function Figure({
  value,
  label,
  note,
}: {
  value: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
        {label}
      </span>
      <span className="[font-family:var(--font-heading)] text-[22px] leading-[1.05] font-medium tracking-[-0.02em] text-zinc-950 tabular-nums">
        {value}
      </span>
      {note && (
        <span className="text-[11px] leading-[1.4] text-(--color-muted)">
          {note}
        </span>
      )}
    </div>
  );
}

export function NetworkScale() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2.5">
        <span className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
          Network scale
        </span>
        <span className="border border-(--color-border) bg-(--color-surface-1) px-1.5 py-0.5 [font-family:var(--font-mono)] font-features-['case'] text-[9.5px] leading-none font-medium tracking-[0.4px] text-(--color-text-subtle) uppercase">
          {S.chain} · {S.takenOn}
        </span>
        <span className="text-[10.5px] leading-none text-(--color-muted) tabular-nums">
          block {S.atBlock.toLocaleString("en-US")}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-x-5 gap-y-4 max-md:grid-cols-2">
        <Figure value={S.miners.toLocaleString("en-US")} label="Miners" />
        <Figure
          value={S.minersWithWins.toLocaleString("en-US")}
          label="Have won a proof"
        />
        <Figure
          value={S.topologyNodes.toLocaleString("en-US")}
          label="Topology nodes"
        />
        <Figure
          value={S.topologyEdges.toLocaleString("en-US")}
          label="Topology edges"
        />
      </div>

      {/* Reported, not interpreted — see the note at the top of this file. */}
      <div className="flex flex-col gap-1.5 border-t border-(--color-border) pt-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="[font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase">
            Share of miners that have won
          </span>
          <span className="[font-family:var(--font-mono)] text-[11.5px] leading-none font-medium text-(--color-accent-text) tabular-nums">
            {(won * 100).toFixed(1)}%
          </span>
        </div>
        <div
          className="h-[6px] w-full overflow-hidden bg-(--color-surface-2)"
          role="img"
          aria-label={`${S.minersWithWins} of ${S.miners} miners have won at least one proof`}
        >
          <div
            className="h-full bg-(--color-accent)"
            style={{ width: `${Math.max(won * 100, 0.6)}%` }}
          />
        </div>
        <p className="m-0 text-[11px] leading-[1.45] text-(--color-muted)">
          {S.minersWithWins.toLocaleString("en-US")} of{" "}
          {S.miners.toLocaleString("en-US")} registered miners have landed at
          least one proof.
        </p>
      </div>
    </div>
  );
}

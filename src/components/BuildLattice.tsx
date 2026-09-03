import { useEffect, useRef } from "react";

/*
 * A bespoke graphic for the dev portal: a truss that assembles itself.
 *
 * Written from scratch rather than reusing @quip/pattern-gen on purpose. Every
 * other Quip surface animates a pattern-gen field, so a pattern-gen backdrop
 * here would read as "another Quip page" exactly where we want "this is the
 * place you build". The subject is construction: members snap into a lattice
 * left to right, a coral leading edge marks what was just placed, and plus
 * glyphs fly in ahead of it carrying the next members.
 *
 * Brand discipline held: the glyph vocabulary is the diamond and the plus (the
 * square is reserved elsewhere), coral is the only accent, everything else is
 * zinc, and there is no glow, bloom or easing flourish.
 */

const COL_GAP = 52;
const ROW_GAP = 44;
const NODE = 3.1;

// One pass: build, hold, fade, repeat.
const BUILD_MS = 9000;
const HOLD_MS = 1600;
const FADE_MS = 1400;
const CYCLE_MS = BUILD_MS + HOLD_MS + FADE_MS;

// Members sit on a zinc-50 panel, so they need zinc-400 to read at 1px;
// zinc-250 measured as effectively invisible against the background.
const INK = {
  planned: "#e4e4e7",
  member: "#9f9fa9",
  node: "#52525c",
  accent: "#ff6c78",
};

// The full truss is always drawn faintly as "planned", and the solid structure
// builds into it. Without this the canvas is nearly empty for the first few
// seconds after load, which is a poor first frame for a masthead graphic.
// It also means a throttled tab (backgrounded, reduced-motion) still shows a
// composed image rather than a blank panel.
const START_OFFSET_MS = 4200;

// Members appearing within this many indices of the leading edge stay coral.
const ACTIVE_WINDOW = 7;

interface Member {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  order: number;
}

interface Node {
  x: number;
  y: number;
  order: number;
}

function buildTruss(w: number, h: number) {
  const cols = Math.max(3, Math.ceil(w / COL_GAP) + 1);
  const rows = Math.max(3, Math.ceil(h / ROW_GAP) + 1);
  const members: Member[] = [];
  const nodes: Node[] = [];
  let order = 0;

  const px = (c: number) => c * COL_GAP;
  const py = (r: number) => r * ROW_GAP;

  // Column by column, so the structure visibly grows in one direction.
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      nodes.push({ x: px(c), y: py(r), order: order });
      // Vertical post.
      if (r < rows - 1) {
        members.push({
          x1: px(c),
          y1: py(r),
          x2: px(c),
          y2: py(r + 1),
          order: order++,
        });
      }
      // Horizontal chord.
      if (c < cols - 1) {
        members.push({
          x1: px(c),
          y1: py(r),
          x2: px(c + 1),
          y2: py(r),
          order: order++,
        });
      }
      // One diagonal brace per cell, alternating, which is what makes it read
      // as a truss rather than graph paper.
      if (c < cols - 1 && r < rows - 1) {
        const flip = (c + r) % 2 === 0;
        members.push({
          x1: px(c),
          y1: flip ? py(r) : py(r + 1),
          x2: px(c + 1),
          y2: flip ? py(r + 1) : py(r),
          order: order++,
        });
      }
    }
  }
  return { members, nodes, total: order };
}

function diamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function plus(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
}

export function BuildLattice({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let truss = buildTruss(0, 0);
    let w = 0;
    let h = 0;
    let raf = 0;
    let start = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      truss = buildTruss(w, h);
    };

    const draw = (elapsed: number) => {
      const { members, nodes, total } = truss;
      const phase = (elapsed + START_OFFSET_MS) % CYCLE_MS;
      const building = Math.min(1, phase / BUILD_MS);
      const edge = building * total;

      let alpha = 1;
      if (phase > BUILD_MS + HOLD_MS) {
        alpha = 1 - (phase - BUILD_MS - HOLD_MS) / FADE_MS;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.lineCap = "round";

      // The planned truss, always present.
      ctx.strokeStyle = INK.planned;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const m of members) {
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
      }
      ctx.stroke();

      // Settled members.
      ctx.strokeStyle = INK.member;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const m of members) {
        if (m.order > edge - ACTIVE_WINDOW) continue;
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
      }
      ctx.stroke();

      // The leading edge, in the one accent.
      ctx.strokeStyle = INK.accent;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (const m of members) {
        if (m.order > edge || m.order <= edge - ACTIVE_WINDOW) continue;
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
      }
      ctx.stroke();

      // Nodes, once their column has been reached.
      ctx.fillStyle = INK.node;
      for (const n of nodes) {
        if (n.order > edge) continue;
        diamond(ctx, n.x, n.y, NODE);
        ctx.fill();
      }

      // Units in flight, just ahead of the edge.
      ctx.strokeStyle = INK.accent;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const target = members[Math.floor(edge) + i * 3];
        if (!target) break;
        const sub = 1 - i / 4;
        const fromX = target.x1 + COL_GAP * 1.6 * (1 - sub);
        const fromY = target.y1 - ROW_GAP * 0.9 * (1 - sub);
        ctx.globalAlpha = Math.max(0, alpha) * sub * 0.75;
        plus(ctx, fromX, fromY, 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (!start) start = now;
      draw(now - start);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      // Show the finished structure, held.
      draw(BUILD_MS - START_OFFSET_MS);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => {
      resize();
      if (reduced) draw(BUILD_MS - START_OFFSET_MS);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}

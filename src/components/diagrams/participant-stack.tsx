import "./diagram.css";
import { Edge, NODE_TEXT_INSET, TextBlock } from "./Diagram";
import { data, layouts, type ItemShape, type StackLayer, type StackLayout } from "./participant-stack.data";
import type { DiagramEdge, DiagramLayout } from "./types";

export { data };

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text className="qd-name" x={x} y={y} textAnchor="middle">
      <tspan x={x} y={y}>
        {text}
      </tspan>
    </text>
  );
}

/* The image gives each consumer sector an oval and a stick figure. */
function Person({ box, label }: { box: Box; label: string }) {
  const cx = box.x + box.w / 2;
  const hips = box.y + box.h - 14;
  return (
    <>
      <ellipse className="qd-shape" cx={cx} cy={box.y + 13} rx={box.w / 2 - 0.5} ry={12.5} />
      <Label x={cx} y={box.y + 17.5} text={label} />
      <circle className="qd-figure" cx={cx} cy={box.y + 34.5} r={4.5} />
      <path
        className="qd-figure"
        d={`M${cx} ${box.y + 39} V${hips} M${cx - 9} ${box.y + 45} H${cx + 9} M${cx - 8} ${box.y + box.h} L${cx} ${hips} L${cx + 8} ${box.y + box.h}`}
      />
    </>
  );
}

function Cube({ box, depth, label }: { box: Box; depth: number; label: string }) {
  const [l, t, r, b] = [box.x, box.y, box.x + box.w, box.y + box.h];
  return (
    <>
      <polygon
        className="qd-shape"
        points={`${l},${t + depth} ${l + depth},${t} ${r},${t} ${r - depth},${t + depth}`}
      />
      <polygon
        className="qd-shape"
        points={`${r - depth},${t + depth} ${r},${t} ${r},${b - depth} ${r - depth},${b}`}
      />
      <rect className="qd-shape" x={l} y={t + depth} width={box.w - depth} height={box.h - depth} />
      <Label x={l + (box.w - depth) / 2} y={t + depth + (box.h - depth) / 2 + 4.5} text={label} />
    </>
  );
}

/* Three sheets, the front one with the document's wavy foot. */
function Sheets({ box, depth, label }: { box: Box; depth: number; label: string }) {
  const [w, h] = [box.w - depth * 2, box.h - depth];
  const sheet = (x: number, y: number) =>
    `M${x} ${y} H${x + w} V${y + h - 6} C${x + w * 0.66} ${y + h + 5} ${x + w * 0.33} ${y + h - 13} ${x} ${y + h - 3} Z`;
  return (
    <>
      <path className="qd-shape" d={sheet(box.x + depth * 2, box.y)} />
      <path className="qd-shape" d={sheet(box.x + depth, box.y + depth / 2)} />
      <path className="qd-shape" d={sheet(box.x, box.y + depth)} />
      <Label x={box.x + w / 2} y={box.y + depth + h / 2} text={label} />
    </>
  );
}

/* Two plain rectangles, one behind the other. */
function Rects({ box, depth, label }: { box: Box; depth: number; label: string }) {
  const [w, h] = [box.w - depth, box.h - depth];
  return (
    <>
      <rect className="qd-shape" x={box.x + depth} y={box.y} width={w} height={h} />
      <rect className="qd-shape" x={box.x} y={box.y + depth} width={w} height={h} />
      <Label x={box.x + w / 2} y={box.y + depth + h / 2 + 4.5} text={label} />
    </>
  );
}

function Item({ shape, box, depth, label }: { shape: ItemShape; box: Box; depth: number; label: string }) {
  return (
    <g data-kind="item" data-id={label} data-shape={shape}>
      {shape === "person" && <Person box={box} label={label} />}
      {shape === "cube" && <Cube box={box} depth={depth} label={label} />}
      {shape === "sheets" && <Sheets box={box} depth={depth} label={label} />}
      {shape === "rects" && <Rects box={box} depth={depth} label={label} />}
    </g>
  );
}

function Layer({ layer, row, layout }: { layer: StackLayer; row: number; layout: StackLayout }) {
  const top = layout.frame.y + row * layout.rowHeight;
  const { x, y, w, h, gap, depth } = layout.items;
  const width = (w - gap * (layer.items.length - 1)) / layer.items.length;
  const lines = layout.nameOnOneLine ? [layer.name.join(" ")] : layer.name;
  return (
    <>
      <g data-kind="layer" data-id={layer.id}>
        <text className="qd-name">
          {lines.map((line, i) => (
            <tspan key={i} x={layout.name.x} y={top + layout.name.y + i * 17}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
      {layer.items.map((item, i) => (
        <Item
          key={item.label}
          shape={item.shape}
          depth={depth}
          label={item.label}
          box={{ x: x + i * (width + gap), y: top + y, w: width, h }}
        />
      ))}
    </>
  );
}

/* A hollow arrow across the divider between a layer and the next, its label inside. */
function Block({ flow, row, layout }: { flow: (typeof data.flows)[number]; row: number; layout: StackLayout }) {
  const divider = layout.frame.y + (row + 1) * layout.rowHeight;
  const { cx, top, neck, bottom, shaft, head, baseline } = layout.block;
  const points = [
    [cx - shaft, divider + top],
    [cx + shaft, divider + top],
    [cx + shaft, divider + neck],
    [cx + head, divider + neck],
    [cx, divider + bottom],
    [cx - head, divider + neck],
    [cx - shaft, divider + neck],
  ]
    .map((p) => p.join(","))
    .join(" ");
  return (
    <g data-kind="edge" data-id={flow.id} data-from={flow.from} data-to={flow.to} data-style="block">
      <polygon className="qd-block" points={points} />
      <text className="qd-edge-label" x={cx} y={divider + baseline} textAnchor="middle">
        <tspan x={cx} dy={0}>
          {flow.label[0]}
        </tspan>
      </text>
    </g>
  );
}

function Drawing({ layout, name }: { layout: StackLayout; name: "wide" | "narrow" }) {
  const { frame, rowHeight, liquidity, bus } = layout;
  const rows = data.layers.length;
  const routes = { edges: layout.routes } as DiagramLayout;
  return (
    <svg
      className={`qd-${name}`}
      data-layout={name}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
      <rect className="qd-frame" x={frame.x} y={frame.y} width={frame.w} height={rows * rowHeight} />
      {data.layers.slice(1).map((l, i) => (
        <path
          key={l.id}
          className="qd-frame"
          d={`M${frame.x} ${frame.y + (i + 1) * rowHeight} H${frame.x + frame.w}`}
        />
      ))}
      {data.layers.map((layer, row) => (
        <Layer key={layer.id} layer={layer} row={row} layout={layout} />
      ))}
      {data.flows
        .filter((f) => f.style === "block")
        .map((flow) => (
          <Block key={flow.id} flow={flow} row={data.layers.findIndex((l) => l.id === flow.from)} layout={layout} />
        ))}

      <g data-kind="bus" data-style="thick">
        <path className="qd-edge" d={bus.path} />
        {data.bus.layers.map((id) => {
          const tick = bus.ticks[id];
          return <path key={id} className="qd-edge" data-to={id} d={`M${tick.x} ${tick.y} H${tick.to}`} />;
        })}
      </g>
      {data.flows
        .filter((f) => f.style === "thick")
        .map((flow) => (
          <Edge key={flow.id} edge={flow as DiagramEdge} layout={routes} />
        ))}

      <g data-kind="node" data-id={data.liquidity.id}>
        <rect className="qd-node" x={liquidity.x} y={liquidity.y} width={liquidity.w} height={liquidity.h} />
        <TextBlock box={liquidity} lines={data.liquidity.lines} nameLines={2} x={liquidity.x + NODE_TEXT_INSET} />
      </g>
    </svg>
  );
}

/**
 * Takes the place of the image's <picture> in its figure, so the page's own figcaption stays and
 * the alt text the page already carries names it. Reached through remark-bespoke-figures.mjs.
 */
export function ParticipantStack({ alt }: { alt: string }) {
  return (
    <div className="quip-diagram not-prose" role="img" aria-label={alt} data-diagram={data.id}>
      <Drawing layout={layouts.wide} name="wide" />
      <Drawing layout={layouts.narrow} name="narrow" />
    </div>
  );
}

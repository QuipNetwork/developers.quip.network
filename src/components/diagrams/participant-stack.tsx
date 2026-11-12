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

/* Every item is the same flat tile. The image's ovals, cubes and sheets stay in the data as what
   each item is, but a diagram in this style says that with its label, not a drawn object. */
function Item({ shape, box, label }: { shape: ItemShape; box: Box; label: string }) {
  return (
    <g data-kind="item" data-id={label} data-shape={shape}>
      <rect className="qd-node" x={box.x} y={box.y} width={box.w} height={box.h} />
      <Label x={box.x + box.w / 2} y={box.y + box.h / 2 + 4.5} text={label} />
    </g>
  );
}

function Layer({ layer, row, layout }: { layer: StackLayer; row: number; layout: StackLayout }) {
  const top = layout.frame.y + row * layout.rowHeight;
  const { x, y, w, h, gap } = layout.items;
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
          label={item.label}
          box={{ x: x + i * (width + gap), y: top + y, w: width, h }}
        />
      ))}
    </>
  );
}

/* What moves down to the next layer: a tag sitting on the divider, with a small arrowhead below it. */
function Block({ flow, row, layout }: { flow: (typeof data.flows)[number]; row: number; layout: StackLayout }) {
  const divider = layout.frame.y + (row + 1) * layout.rowHeight;
  const { cx } = layout.block;
  const [w, h] = [48, 20];
  const foot = divider + h / 2;
  return (
    <g data-kind="edge" data-id={flow.id} data-from={flow.from} data-to={flow.to} data-style="block">
      <rect className="qd-tag" x={cx - w / 2} y={divider - h / 2} width={w} height={h} />
      <polygon className="qd-head" points={`${cx - 5},${foot} ${cx + 5},${foot} ${cx},${foot + 7}`} />
      <text className="qd-edge-label" x={cx} y={divider + 4} textAnchor="middle">
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
      {layout.junctions.map(([x, y]) => (
        <circle key={`${x},${y}`} className="qd-junction" cx={x} cy={y} r={2.5} />
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

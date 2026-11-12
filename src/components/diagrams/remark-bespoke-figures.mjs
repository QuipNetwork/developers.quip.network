/**
 * Swaps a figure's <picture> for a hand-drawn component when its image is one we have redrawn,
 * leaving the <figure> and its <figcaption> alone and carrying the alt text across. MDX does not
 * route tags written as JSX through its components map, so this has to happen in the tree.
 *
 * A different filename misses, and the page shows the image as before. The Markdown twins are
 * written from docs/ by scripts/sync-docs.mjs and never pass through here.
 */
const FIGURES = new Map([["stakeholder-categories-2", "ParticipantStack"]]);

const attribute = (node, name) => node.attributes?.find((a) => a.name === name)?.value;

function imageIn(node) {
  for (const child of node.children ?? []) {
    if (child.name === "img") return child;
    const found = imageIn(child);
    if (found) return found;
  }
}

function replace(node) {
  for (const [i, child] of (node.children ?? []).entries()) {
    if (child.name === "picture") {
      const img = imageIn(child);
      const src = img && attribute(img, "src");
      const base = typeof src === "string" ? src.match(/([^/]+)\.[a-z]+$/i)?.[1] : undefined;
      const component = base && FIGURES.get(base);
      if (component) {
        node.children[i] = {
          type: child.type,
          name: component,
          attributes: [{ type: "mdxJsxAttribute", name: "alt", value: attribute(img, "alt") }],
          children: [],
        };
        continue;
      }
    }
    replace(child);
  }
}

export function remarkBespokeFigures() {
  return (tree) => replace(tree);
}

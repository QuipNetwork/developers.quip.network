#!/usr/bin/env node
/*
 * The Reference tree's generated half, run in `prebuild` after sync-docs.mjs.
 *
 *   content/docs/reference/<sdk>.mdx    one <auto-type-table> per export, found by reading
 *                                       the pinned package's .d.ts. Committed: the diff is
 *                                       what a version bump changes.
 *   public/docs/reference/<page>.md     the Markdown twins the MCP server and "View as
 *                                       Markdown" read. Gitignored with public/docs/.
 *
 * The page's tables come from remarkAutoTypeTable (src/lib/source.ts) and the twin's from
 * the same generator with the same options, so they cannot print different facts.
 *
 * Nothing here is written by hand about an export: a description is the package's own doc
 * comment, and an export with no comment shows its type alone.
 *
 * Fails closed: on a package subpath no page covers, a pin that differs from what is
 * installed, a faucet spec that disagrees with src/data/testnet.ts, or a contract address
 * reaching any output (see the embargo note in src/data/testnet.ts).
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createProject } from "fumadocs-typescript";
import ts from "typescript";
import { parse as parseYaml } from "yaml";
import { createReferenceGenerator, firstParagraph, typeTableOptions } from "../src/lib/reference-tables.mjs";

const root = path.resolve(import.meta.dirname, "..");
const contentDir = path.join(root, "content/docs/reference");
const twinDir = path.join(root, "public/docs/reference");
const LONG_TYPE = 1500; // Characters. ABI literal types run to thousands of lines.

const SDKS = [
  {
    slug: "ethereum-sdk",
    pkg: "@quip.network/ethereum-sdk",
    title: "Ethereum SDK",
    description: "Types exported by @quip.network/ethereum-sdk, the account client for EVM chains.",
    intro:
      "TypeScript SDK for post-quantum-secured smart-contract wallets on EVM chains. Only the subpaths below can be imported: the package has no root entry point.",
    warning:
      "The package README describes it as in active development and not production-ready: APIs, contract addresses and the on-chain key schema may change between releases.",
    guide: "[SDK guide](/docs/getting-started/quip-sdk)",
    entries: [
      { sub: "v1/shrincs", about: "The current wallet family: the SHRINCS clients." },
      { sub: "v1", about: "The surface shared across wallet families." },
      { sub: "v1/abi" },
      { sub: "v1/addresses" },
      { sub: "v1/errors" },
      { sub: "v1/gas" },
      { sub: "v1/userOpCodec" },
      { sub: "deprecated/v0", namesOnly: true },
    ],
  },
  {
    slug: "quip-swap-sdk",
    pkg: "@quip.network/quip-swap-sdk",
    title: "Quip Swap SDK",
    description: "Types exported by @quip.network/quip-swap-sdk, the client for the QuipSwap Omnibus contract.",
    intro:
      "TypeScript SDK for the Quip Swap Omnibus protocol: hashlocked same-chain and cross-chain swaps of Native, ERC-20, ERC-721 and ERC-1155 assets. Built on viem, a peer dependency.",
    warning:
      "The package README asks integrators to read its section on ways to lose funds first. Cross-chain takers can lose funds by skipping commitment verification, and overriding the default buffers too tight can forfeit windows.",
    guide: "[Integrating guide](/docs/quipswap/integrating)",
    entries: [{ sub: "." }],
  },
];

// ---------- text helpers ----------

/** Inline code for any text: types can contain backticks (`0x${string}`). */
const code = (text) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.includes("`") ? `\`\` ${flat} \`\`` : `\`${flat}\``;
};
const cell = (text) => text.replace(/\s+/g, " ").replaceAll("|", "\\|").trim();

/** Makes Markdown prose safe for MDX. Inline code is left alone. */
const mdxProse = (text) =>
  text
    .split(/(`+[^`]*`+)/)
    .map((part, index) => (index % 2 ? part : part.replace(/[{}]/g, "\\$&").replaceAll("<", "&lt;")))
    .join("");

const markdownTable = (head, rows) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");

/** A type-table row as the page shows it when opened: comment, tags, then the full type. */
function rowOf(entry) {
  const notes = [];
  if (entry.deprecated) notes.push("**Deprecated.**");
  if (entry.description) notes.push(entry.description);
  for (const { name, text } of entry.tags) {
    if (name === "default" || name === "defaultValue") notes.push(`Default: ${code(text)}.`);
    if (name === "param" && text) notes.push(`Parameter ${text}`);
    if (name === "returns" && text) notes.push(`Returns: ${text}`);
  }
  return [code(`${entry.name}${entry.required ? "" : "?"}`), code(entry.type), notes.join(" ")].map(cell);
}

// ---------- reading a package's exports ----------

function classify(program, entry) {
  const checker = program.getTypeChecker();
  const file = program.getSourceFile(entry.file);
  if (!file) throw new Error(`${entry.file} did not load`);
  const module = checker.getSymbolAtLocation(file);
  return checker.getExportsOfModule(module).map((exported) => {
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const declaration = symbol.declarations?.[0];
    const doc = firstParagraph(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
    const out = {
      name: exported.name,
      doc,
      // The same declaration re-exported from a second subpath is documented once.
      id: declaration ? `${declaration.getSourceFile().fileName}:${declaration.pos}` : `${entry.file}:${exported.name}`,
    };
    const { flags } = symbol;
    if (flags & ts.SymbolFlags.Class) {
      const type = checker.getTypeOfSymbolAtLocation(symbol, file);
      const signature = type.getConstructSignatures()[0];
      const instance = signature.getReturnType();
      const base = instance.getBaseTypes()?.[0];
      const isPrivate = (property) =>
        (property.declarations ?? []).some((node) => ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Private);
      const isOwn = (property) => (property.declarations ?? []).some((node) => node.getSourceFile().fileName.includes("/@quip.network/"));
      const isError = (candidate) =>
        !!candidate && (candidate.symbol?.name === "Error" || (candidate.getBaseTypes() ?? []).some(isError));
      return {
        ...out,
        kind: isError(base) && base.symbol?.name !== "Error" ? "error" : "class",
        ctor:
          signature.declaration && !(ts.getCombinedModifierFlags(signature.declaration) & ts.ModifierFlags.Private)
            ? signature.declaration.getText().replace(/\s+/g, " ").replace(/;$/, "")
            : "",
        // A .d.ts still declares private members, and Error brings statics from the runtime's lib.
        members: instance.getProperties().filter((property) => !isPrivate(property)).map((property) => property.name),
        statics: type
          .getProperties()
          .filter((property) => property.name !== "prototype" && isOwn(property) && !isPrivate(property))
          .map((property) => property.name),
      };
    }
    if (flags & ts.SymbolFlags.Function) return { ...out, kind: "function" };
    if (flags & ts.SymbolFlags.Enum) return { ...out, kind: "enum" };
    if (flags & ts.SymbolFlags.Variable) {
      const text = checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, file), file, ts.TypeFormatFlags.NoTruncation);
      return { ...out, kind: text.length > LONG_TYPE ? "long" : "constant" };
    }
    if (flags & ts.SymbolFlags.Module) return { ...out, kind: "namespace" };
    if (flags & ts.SymbolFlags.Interface) return { ...out, kind: "interface" };
    if (flags & ts.SymbolFlags.TypeAlias) {
      return { ...out, kind: "alias", text: declaration.getText().replace(/^(export\s+)?(declare\s+)?/, "") };
    }
    throw new Error(`${entry.pkgPath}: cannot classify export ${exported.name}`);
  });
}

// ---------- pages, as blocks both renderers walk ----------

// Headings that name code print as code: entry points and exports, not the group labels.
const heading = (level, text, isCode = level !== 3) => ({ kind: "heading", level, text: isCode ? code(text) : text });
const prose = (text) => ({ kind: "prose", text });
const fence = (text, lang = "ts") => ({ kind: "fence", text, lang });
const table = (props) => ({ kind: "autoTable", props });
const rows = (head, body) => ({ kind: "rows", head, body });

const identifier = (text) => text.replace(/[^A-Za-z0-9]+(.)?/g, (_, next = "") => next.toUpperCase());
const union = (items) => items.map((item) => JSON.stringify(item.name)).join(" | ");

function entryBlocks(entry, items, seen) {
  const fresh = items.filter((item) => !seen.has(item.id));
  const repeated = items.filter((item) => seen.has(item.id));
  for (const item of fresh) seen.add(item.id);
  const blocks = [heading(2, entry.pkgPath)];
  if (entry.about) blocks.push(prose(entry.about));
  if (repeated.length) {
    const names = repeated.map((item) => code(item.name)).join(", ");
    blocks.push(prose(`Also exports these, documented above: ${names}.`));
  }
  const of = (kind) => fresh.filter((item) => item.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
  const mod = `import("${entry.pkgPath}")`;
  const tag = identifier(entry.sub === "." ? "root" : entry.sub);
  const described = (item) => (item.doc ? [prose(item.doc)] : []);

  const classes = of("class");
  if (classes.length) blocks.push(heading(3, "Classes"));
  for (const item of classes) {
    blocks.push(heading(4, item.name), ...described(item));
    if (item.ctor) blocks.push(fence(item.ctor));
    const instance = `${mod}.${item.name}`;
    const names = (list) => list.map((name) => JSON.stringify(name)).join(" | ");
    if (item.members.length) blocks.push(table({ name: `${item.name}Members`, type: `Pick<${instance}, ${names(item.members)}>` }));
    if (item.statics.length) {
      blocks.push(prose("Static members:"), table({ name: `${item.name}Statics`, type: `Pick<typeof ${instance}, ${names(item.statics)}>` }));
    }
  }

  const functions = of("function");
  if (functions.length) {
    blocks.push(heading(3, "Functions"), table({ name: `${tag}Functions`, type: `Pick<typeof ${mod}, ${union(functions)}>` }));
  }

  const constants = of("constant");
  if (constants.length) {
    blocks.push(heading(3, "Constants"), table({ name: `${tag}Constants`, type: `Pick<typeof ${mod}, ${union(constants)}>` }));
  }
  const long = of("long");
  if (long.length) {
    blocks.push(heading(3, "ABIs and long literals"), prose("Their literal types run too long to print here."));
    blocks.push(
      rows(
        ["Export", "Description"],
        long.map((item) => [code(item.name), cell(item.doc)]),
      ),
    );
  }

  const enums = of("enum");
  if (enums.length) blocks.push(heading(3, "Enums"));
  for (const item of enums) {
    blocks.push(heading(4, item.name), ...described(item), table({ name: `${item.name}Enum`, type: `typeof ${mod}.${item.name}` }));
  }

  const namespaces = of("namespace");
  if (namespaces.length) blocks.push(heading(3, "Namespaces"));
  for (const item of namespaces) {
    blocks.push(heading(4, item.name), ...described(item), table({ name: `${item.name}Namespace`, type: `typeof ${mod}.${item.name}` }));
  }

  const errors = of("error");
  if (errors.length) {
    const documented = errors.some((item) => item.doc);
    blocks.push(
      heading(3, "Error classes"),
      rows(
        ["Error", "Constructor", ...(documented ? ["Description"] : [])],
        errors.map((item) => [code(item.name), item.ctor ? cell(code(item.ctor)) : "", ...(documented ? [cell(item.doc)] : [])]),
      ),
    );
  }

  const interfaces = of("interface");
  if (interfaces.length) blocks.push(heading(3, "Interfaces"));
  for (const item of interfaces) {
    blocks.push(heading(4, item.name), ...described(item), table({ path: entry.pkgFile, name: item.name, cwd: true }));
  }

  const aliases = of("alias");
  if (aliases.length) blocks.push(heading(3, "Type aliases"));
  for (const item of aliases) blocks.push(heading(4, item.name), ...described(item), fence(item.text));

  return blocks;
}

async function sdkBlocks(sdk, program, version, pkgExports) {
  const covered = sdk.entries.map((entry) => entry.sub);
  const published = Object.keys(pkgExports).map((key) => (key === "." ? "." : key.replace(/^\.\//, "")));
  const missing = published.filter((sub) => sub !== "package.json" && !covered.includes(sub));
  if (missing.length) throw new Error(`${sdk.pkg} exports subpaths with no reference section: ${missing.join(", ")}`);

  const install = `npm install ${sdk.pkg}@${version}`;
  const blocks = [
    prose(`Documented version: ${code(version)}.`),
    prose(sdk.intro),
    { kind: "warning", title: "Read first", text: sdk.warning },
    fence(install, "sh"),
    prose(
      `Generated at build from the type declarations in the published package. A description is the first paragraph of the package's own doc comment, and an export with none shows its type alone. For walkthroughs, see the ${sdk.guide}.`,
    ),
  ];
  const seen = new Set();
  for (const entry of sdk.entries) {
    const items = classify(program, entry);
    if (entry.namesOnly) {
      const comment = (await readFile(entry.file, "utf8")).match(/^\/\*\*([\s\S]*?)\*\//)?.[1] ?? "";
      // The file's own deprecation notice: what it is for, and where to go instead.
      const notice = comment.replace(/^[ \t]*\*[ \t]?/gm, "").trim().split(/\n\s*\n/);
      blocks.push(heading(2, entry.pkgPath));
      blocks.push(prose(`Deprecated. ${firstParagraph(notice[1])} ${firstParagraph(notice.at(-1))}`));
      blocks.push(prose("No tables for this entry point. It exports these:"));
      blocks.push(prose(items.map((item) => code(item.name)).sort().join(", ")));
      continue;
    }
    blocks.push(...entryBlocks(entry, items, seen));
  }
  return blocks;
}

function attr(name, value) {
  if (value === true) return name;
  return `${name}='${value}'`;
}

function toMdx(sdk, blocks) {
  const parts = [
    `---\ntitle: ${JSON.stringify(sdk.title)}\ndescription: ${JSON.stringify(sdk.description)}\n---`,
    `{/* Generated by scripts/sync-reference.mjs from the pinned package. Do not edit by hand. */}`,
    `import { TypeTable } from "fumadocs-ui/components/type-table";`,
  ];
  for (const block of blocks) {
    if (block.kind === "heading") parts.push(`${"#".repeat(block.level)} ${block.text}`);
    if (block.kind === "prose") parts.push(mdxProse(block.text));
    if (block.kind === "warning") parts.push(`<Callout type="warn" title=${JSON.stringify(block.title)}>\n${mdxProse(block.text)}\n</Callout>`);
    if (block.kind === "fence") parts.push(`\`\`\`${block.lang}\n${block.text}\n\`\`\``);
    if (block.kind === "rows") parts.push(markdownTable(block.head, block.body.map((row) => row.map(mdxProse))));
    if (block.kind === "autoTable") {
      const props = Object.entries(block.props).map(([key, value]) => attr(key, value));
      parts.push(`<auto-type-table ${props.join(" ")} />`);
    }
  }
  return `${parts.join("\n\n")}\n`;
}

async function toTwin(sdk, blocks, generator) {
  const parts = [`# ${sdk.title}`, sdk.description];
  for (const block of blocks) {
    if (block.kind === "heading") parts.push(`${"#".repeat(block.level)} ${block.text}`);
    if (block.kind === "prose") parts.push(block.text);
    if (block.kind === "warning") parts.push(`> **${block.title}**\n>\n> ${block.text}`);
    if (block.kind === "fence") parts.push(`\`\`\`${block.lang}\n${block.text}\n\`\`\``);
    if (block.kind === "rows") parts.push(markdownTable(block.head, block.body));
    if (block.kind === "autoTable") {
      const { cwd, ...props } = block.props;
      const docs = await generator.generateTypeTable(props, { ...typeTableOptions, basePath: cwd ? root : undefined });
      for (const doc of docs) parts.push(markdownTable(["Name", "Type", "Description"], doc.entries.map(rowOf)));
    }
  }
  return `${parts.join("\n\n")}\n`;
}

// ---------- hand-written pages: index and faucet ----------

function operationTwin(spec, { path: route, method }) {
  const operation = spec.paths[route]?.[method];
  if (!operation) throw new Error(`openapi/faucet.yaml has no ${method} ${route}`);
  const out = [`**\`${method.toUpperCase()} ${spec.servers[0].url}${route}\`**: ${operation.description}`];
  const json = operation.requestBody?.content?.["application/json"];
  if (json) {
    const { properties, required = [] } = json.schema;
    out.push(
      "Request body, `application/json`:",
      markdownTable(
        ["Field", "Type", "Required", "Description"],
        Object.entries(properties).map(([name, field]) =>
          [code(name), code(field.type), required.includes(name) ? "yes" : "no", field.description ?? ""].map(cell),
        ),
      ),
    );
  }
  out.push(
    "Responses:",
    markdownTable(
      ["Status", "Description"],
      Object.entries(operation.responses).map(([status, response]) => {
        const example = response.content?.["application/json"]?.example;
        const body = example ? ` Body: ${code(JSON.stringify(example))}.` : "";
        return [code(status), cell(`${response.description}${body}`)];
      }),
    ),
  );
  return out.join("\n\n");
}

function handWrittenTwin(source, spec) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  const field = (name) => match[1].match(new RegExp(`^${name}:\\s*(.+)$`, "m"))[1].trim();
  const body = source
    .slice(match[0].length)
    .replace(/^import .*\n+/gm, "")
    .replace(/<Callout type="[^"]*" title="([^"]*)">\n([\s\S]*?)\n<\/Callout>/g, (_, title, text) => `> **${title}**\n>\n> ${text}`)
    .replace(/<FaucetApi path="([^"]+)" method="([^"]+)" \/>/g, (_, route, method) => operationTwin(spec, { path: route, method }));
  return `# ${field("title")}\n\n${field("description")}\n\n${body.trim()}\n`;
}

/** The spec's facts are copied from the data file; a change there must fail here, not drift. */
async function checkFaucetSpec(spec) {
  const data = await readFile(path.join(root, "src/data/testnet.ts"), "utf8");
  const faucet = data.match(/export const FAUCET = \{([\s\S]*?)\} as const/)?.[1] ?? "";
  const value = (key) => faucet.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
  const route = value("request")?.split(" ");
  const problems = [];
  if (spec.servers[0].url !== value("origin")) problems.push(`server is not ${value("origin")}`);
  if (!spec.paths[route?.[1]]?.[route?.[0].toLowerCase()]) problems.push(`no operation for ${value("request")}`);
  if (!spec.paths[value("health")]) problems.push(`no path for ${value("health")}`);
  if (!spec.paths["/request"]?.post?.description.includes(value("amount"))) problems.push(`does not state ${value("amount")}`);
  if (problems.length) throw new Error(`openapi/faucet.yaml disagrees with FAUCET in src/data/testnet.ts: ${problems.join("; ")}`);
}

// ---------- write ----------

function assertNoAddress(label, text) {
  const hit = text.match(/\b0x[0-9a-fA-F]{40}\b/);
  if (hit) throw new Error(`${label} would publish ${hit[0]}. Contract addresses are embargoed here; see src/data/testnet.ts.`);
}

const pkgJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const files = [];
for (const sdk of SDKS) {
  const pkgDir = path.join(root, "node_modules", sdk.pkg);
  const manifest = JSON.parse(await readFile(path.join(pkgDir, "package.json"), "utf8"));
  if (pkgJson.devDependencies[sdk.pkg] !== manifest.version) {
    throw new Error(`${sdk.pkg}: package.json pins ${pkgJson.devDependencies[sdk.pkg]} but ${manifest.version} is installed.`);
  }
  sdk.version = manifest.version;
  sdk.manifest = manifest;
  for (const entry of sdk.entries) {
    const key = entry.sub === "." ? "." : `./${entry.sub}`;
    const types = manifest.exports[key]?.types;
    if (!types) throw new Error(`${sdk.pkg} no longer exports ${key}`);
    entry.pkgPath = entry.sub === "." ? sdk.pkg : `${sdk.pkg}/${entry.sub}`;
    entry.pkgFile = path.posix.join("node_modules", sdk.pkg, types);
    entry.file = path.posix.join(root.split(path.sep).join("/"), entry.pkgFile);
    files.push(entry.file);
  }
}

const program = ts.createProgram(files, {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  skipLibCheck: true,
  noEmit: true,
});

const project = await createProject({ tsconfigPath: path.join(root, "tsconfig.json") });
const generator = createReferenceGenerator({ project });
await rm(twinDir, { recursive: true, force: true });
await mkdir(twinDir, { recursive: true });

try {
  for (const sdk of SDKS) {
    const blocks = await sdkBlocks(sdk, program, sdk.version, sdk.manifest.exports);
    const mdx = toMdx(sdk, blocks);
    const twin = await toTwin(sdk, blocks, generator);
    assertNoAddress(`${sdk.slug}.mdx`, mdx);
    assertNoAddress(`${sdk.slug}.md`, twin);
    await writeFile(path.join(contentDir, `${sdk.slug}.mdx`), mdx);
    await writeFile(path.join(twinDir, `${sdk.slug}.md`), twin);
    console.log(`sync-reference: ${sdk.pkg}@${sdk.version}, ${blocks.filter((b) => b.kind === "autoTable").length} tables.`);
  }
} finally {
  project.close();
}

const spec = parseYaml(await readFile(path.join(root, "openapi/faucet.yaml"), "utf8"));
await checkFaucetSpec(spec);
// markdownUrlOf() puts a folder's index beside the folder: /docs/reference.md.
for (const [slug, output] of [
  ["index", `${twinDir}.md`],
  ["faucet", path.join(twinDir, "faucet.md")],
]) {
  const twin = handWrittenTwin(await readFile(path.join(contentDir, `${slug}.mdx`), "utf8"), spec);
  assertNoAddress(`${slug}.md`, twin);
  await writeFile(output, twin);
}

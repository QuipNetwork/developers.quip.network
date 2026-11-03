/*
 * How .d.ts exports become type-table rows, shared by the MDX plugin in ./source.ts (the
 * page) and scripts/sync-reference.mjs (its Markdown twin) so both print the same facts.
 */
import { createGenerator } from "fumadocs-typescript";

const unlink = (text) => text.replace(/\{@link(?:code|plain)?\s+([^}|\s]+)[^}]*\}/g, "`$1`");

/** A comment's first paragraph on one line. Rows are for scanning; the package has the rest. */
export const firstParagraph = (text = "") => unlink(text.split(/\n\s*\n/)[0]).replace(/\s*\n\s*/g, " ").trim();

const KEPT_TAGS = new Set(["default", "defaultValue", "deprecated", "param", "returns"]);
// viem's PublicClient and WalletClient expand to 60 KB and more. Their names say enough.
const LONG_TYPE = 2000;

const ALIAS_FLAG = 2097152; // SymbolFlags.Alias

export const typeTableOptions = {
  transform(entry, _type, symbol) {
    const { checker, program } = this;
    // A re-export's own symbol has no comment; the declaration it points at does.
    if (symbol.flags & ALIAS_FLAG) {
      const target = checker.getAliasedSymbol(symbol);
      entry.description = checker.getDocumentationCommentOfSymbol(target);
      entry.tags = checker.getJsDocTagsOfSymbol(target).map((tag) => ({ name: tag.name, text: tag.text ?? "" }));
      entry.deprecated = entry.tags.some((tag) => tag.name === "deprecated");
    }
    entry.description = firstParagraph(entry.description);
    entry.tags = entry.tags
      .filter((tag) => KEPT_TAGS.has(tag.name))
      .map((tag) => ({ name: tag.name, text: firstParagraph(tag.text) }));
    if (entry.type.length > LONG_TYPE) {
      const declared = symbol.declarations?.[0]?.resolve(program)?.type?.getText();
      entry.type = entry.simplifiedType = declared ?? entry.simplifiedType;
    }
  },
};

const PICK = /^Pick<(.+), ("[^"]+"(?: \| "[^"]+")*)>$/;

/**
 * A generator that reads `Pick<T, "a" | "b">` as T's rows filtered to those names. Asking
 * TypeScript for the mapped type itself gives the same rows with their doc comments gone.
 */
export function createReferenceGenerator(options) {
  const generator = createGenerator(options);
  return {
    ...generator,
    async generateTypeTable(props, tableOptions) {
      const pick = props.type?.match(PICK);
      if (!pick) return generator.generateTypeTable(props, tableOptions);
      const keep = new Set(JSON.parse(`[${pick[2].replaceAll(" | ", ",")}]`));
      const docs = await generator.generateTypeTable({ ...props, type: pick[1] }, tableOptions);
      return docs.map((doc) => ({ ...doc, entries: doc.entries.filter((entry) => keep.has(entry.name)) }));
    },
  };
}

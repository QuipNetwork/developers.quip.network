import { createFromSource } from "fumadocs-core/search/server";
import { source } from "./source";

/** One search index, shared by the search dialog and the MCP server. */
export const search = createFromSource(source);

/*
 * The product is called QVM on quip.network and XQuad in these docs, and the docs never use the
 * word. Readers arrive with the product's name, so its names lead to the toolchain's pages.
 */
const PRODUCT_NAMES = /\b(?:qvm|(?:quip|quantum) virtual machine)\b/gi;

export const withProductNames = (query: string) => query.replace(PRODUCT_NAMES, "toolchain");

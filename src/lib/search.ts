import { createFromSource } from "fumadocs-core/search/server";
import { source } from "./source";

/** One search index, shared by the search dialog and the MCP server. */
export const search = createFromSource(source);

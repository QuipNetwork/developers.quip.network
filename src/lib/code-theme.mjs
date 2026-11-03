// Syntax colours for code blocks, on the zinc-900 panel. Built from the brand's accent
// families (tokens/accents.css), which the brand allows for categorical colour. Each passes
// AA on #18181b. Comments use zinc-400.
const c = {
  fg: "#f4f4f5",
  muted: "#9f9fa9",
  coral: "#ff6c78",
  green: "#67e347",
  yellow: "#ffde53",
  cyan: "#4ce0ff",
  pink: "#ff92d5",
  lavender: "#e6d7ff",
};

/** @type {any} */
export const quipCodeTheme = {
  name: "quip",
  type: "dark",
  colors: { "editor.background": "#18181b", "editor.foreground": c.fg },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.muted } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.control"], settings: { foreground: c.coral } },
    { scope: ["string", "string.quoted", "punctuation.definition.string", "markup.inline.raw"], settings: { foreground: c.green } },
    { scope: ["constant.numeric", "constant.language", "constant.character", "constant.other", "support.constant"], settings: { foreground: c.yellow } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "entity.name.command"], settings: { foreground: c.cyan } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], settings: { foreground: c.lavender } },
    { scope: ["entity.name.tag", "meta.preprocessor", "keyword.other.special-method"], settings: { foreground: c.pink } },
    { scope: ["entity.other.attribute-name", "support.type.property-name", "variable.other.property", "meta.object-literal.key"], settings: { foreground: c.lavender } },
    { scope: ["variable", "variable.other", "variable.parameter", "punctuation", "meta.brace", "keyword.operator"], settings: { foreground: c.fg } },
    { scope: ["markup.deleted"], settings: { foreground: c.coral } },
    { scope: ["markup.inserted"], settings: { foreground: c.green } },
  ],
};

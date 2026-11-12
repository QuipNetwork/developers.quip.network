// Syntax colours for code blocks. Both palettes use the brand's accent families, which the brand
// allows for categorical colour, with no coral: code is read, not clicked. Dark uses the pale
// tints, which are calm on zinc 950; light uses the audience inks. Each passes AA on its ground.
const dark = {
  fg: "#e4e4e7",
  muted: "#9f9fa9",
  keyword: "#e6d7ff",
  string: "#eefdca",
  number: "#fef278",
  fn: "#c2f8fd",
  tag: "#ffcde4",
};

const light = {
  fg: "#27272a",
  muted: "#71717b",
  keyword: "#2a1a4d",
  string: "#0a832e",
  number: "#9a5b00",
  fn: "#0b5560",
  tag: "#8b2a30",
};

const theme = (name, type, c, background) => ({
  name,
  type,
  colors: { "editor.background": background, "editor.foreground": c.fg },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.muted } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.control"], settings: { foreground: c.keyword } },
    { scope: ["string", "string.quoted", "punctuation.definition.string", "markup.inline.raw"], settings: { foreground: c.string } },
    { scope: ["constant.numeric", "constant.language", "constant.character", "constant.other", "support.constant"], settings: { foreground: c.number } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "entity.name.command"], settings: { foreground: c.fn } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], settings: { foreground: c.keyword } },
    { scope: ["entity.name.tag", "meta.preprocessor", "keyword.other.special-method"], settings: { foreground: c.tag } },
    { scope: ["entity.other.attribute-name", "support.type.property-name", "variable.other.property", "meta.object-literal.key"], settings: { foreground: c.fn } },
    { scope: ["variable", "variable.other", "variable.parameter", "punctuation", "meta.brace", "keyword.operator"], settings: { foreground: c.fg } },
    { scope: ["markup.deleted"], settings: { foreground: c.tag } },
    { scope: ["markup.inserted"], settings: { foreground: c.string } },
  ],
});

/** @type {any} */
export const quipCodeThemeDark = theme("quip-dark", "dark", dark, "#09090b");
/** @type {any} */
export const quipCodeThemeLight = theme("quip-light", "light", light, "#fafafa");

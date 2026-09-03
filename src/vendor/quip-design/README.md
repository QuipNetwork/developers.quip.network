# Vendored from the Quip design system

These files are copied verbatim from `quip-website/packages/shared/src` so this
repo can build on its own. They are NOT the source of truth.

    components/Headings.tsx        components/Buttons.tsx
    components/PersonaIcon.tsx     components/pageLayout.ts
    components/icons/*             layouts/BaseLayout.astro
    styles/base.css

The design system's own rule is "never fork this system into a project, import
it". Copying here is a deliberate trade for a standalone repo, so it carries an
obligation: when `packages/shared` changes upstream, re-copy these files. Do not
edit them here. Portal-specific styling belongs in `src/styles/index.css`, which
layers on top.

Upstream: git@gitlab.com:quip.network/quip.network.git, packages/shared
Copied:   2026-08-26

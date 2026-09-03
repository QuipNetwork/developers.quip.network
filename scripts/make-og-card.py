"""
Generate the dev portal Open Graph card.

    python3 scripts/make-og-card.py

Structure follows the established per-product card in the monorepo
(apps/main/public/images/og/quipswap.png): 1200x630, light ground, bordered white
card, mono eyebrow, large Favorit title, body lines, four-cell fact strip.

Where it differs, deliberately:
  - the truss pattern is full bleed rather than boxed into a band. It is anchored
    at the top right and faded diagonally so it is gone before it reaches the
    title, which keeps it a background rather than a panel.
  - the real logo lockup sits top left, rasterised from the brand SVG.
  - the tint is the Developers audience tint from quip-design/tokens/audiences.json.

The logo needs `rsvg-convert` (librsvg). If it is missing the card still renders,
without the lockup, and the script says so.
"""

import os
import subprocess
import tempfile
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = "/Users/brentoshiro/projects-quip/quip-brand/fonts"
LOGO_SVG = os.path.join(ROOT, "public/images/quip-logo-with-icon.svg")
OUT = os.path.join(ROOT, "public/images/og/developers.png")

W, H = 1200, 630
M = 24
CARD_W, CARD_H = W - 2 * M, H - 2 * M
BOTTOM_Y = 524
RULE_H = 6          # brand gradient rule along the foot

GROUND = (244, 244, 245)
CARD_BG = (255, 255, 255)
BORDER = (212, 212, 216)
INK = (9, 9, 11)
BODY = (63, 63, 70)
MUTED = (113, 113, 123)
TINT = (255, 226, 218)
CORAL = (255, 108, 120)
MEMBER = (159, 159, 169)   # zinc-400
NODE = (82, 82, 92)        # zinc-600
PLANNED = (228, 228, 231)  # zinc-150

f = lambda name, size: ImageFont.truetype(f"{FONTS}/{name}", size)


def tracked(dr, xy, text, font, fill, tracking):
    """PIL has no letter-spacing, so advance per glyph."""
    x, y = xy
    for ch in text:
        dr.text((x, y), ch, font=font, fill=fill)
        x += dr.textlength(ch, font=font) + tracking


def smoothstep(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def diagonal_mask(w, h):
    """
    Strongest at the top right, thinning gradually to nothing at the lower left,
    with the title and body block held clear.

    Computed on a small grid and scaled up: the falloff is smooth, so sampling it
    at full resolution would cost a million iterations for no visible gain.
    """
    sw, sh = 200, 105
    m = Image.new("L", (sw, sh))
    px = m.load()
    for j in range(sh):
        for i in range(sw):
            xn, yn = i / (sw - 1), j / (sh - 1)
            # Broad diagonal, weighted so the field reaches left along the top
            # (filling beside the lockup) and drops below the midline on the
            # right (filling above the title).
            base = smoothstep(0.14, 0.98, xn * 0.58 + (1 - yn) * 0.42)
            # Keep the text block clear. Clean only where the column AND the rows
            # of the title/body overlap, so the field still fills around it.
            col = smoothstep(0.56, 0.74, xn)
            rows = 1 - smoothstep(0.36, 0.43, yn) * (1 - smoothstep(0.79, 0.87, yn))
            px[i, j] = int(255 * base * max(col, rows))
    return m.resize((w, h), Image.BILINEAR)


def truss_layer(w, h):
    """The assembling-truss graphic, drawn once at card size on transparency."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    COL, ROW = 68, 56
    cols, rows = w // COL + 2, h // ROW + 2

    # No tint wash: the site graphic is structure on white. A coloured field was
    # an invention here and read as pink haze rather than as the same object.
    line = MEMBER + (170,)
    faint = PLANNED + (200,)
    # No leading edge here. On the site it is the face of a structure being
    # built and it moves; frozen on a card it is just a red line with nothing
    # explaining it. The colour comes from the brand gradient rule instead.
    edge_col = int(cols * 0.40)
    for c in range(cols):
        for r in range(rows):
            x, y = c * COL, r * ROW
            built = c >= edge_col
            stroke = line if built else faint
            if r < rows - 1:
                d.line([(x, y), (x, y + ROW)], fill=stroke, width=1)
            if c < cols - 1:
                d.line([(x, y), (x + COL, y)], fill=stroke, width=1)
            if c < cols - 1 and r < rows - 1:
                flip = (c + r) % 2 == 0
                a = (x, y) if flip else (x, y + ROW)
                b = (x + COL, y + ROW) if flip else (x + COL, y)
                d.line([a, b], fill=stroke, width=1)

    for c in range(cols):
        for r in range(rows):
            x, y = c * COL, r * ROW
            s = 3.0
            d.polygon(
                [(x, y - s), (x + s, y), (x, y + s), (x - s, y)],
                fill=(NODE + (215,)) if c >= edge_col else (PLANNED + (220,)),
            )
    return layer


def load_logo(height):
    """Rasterise the brand lockup. Returns None if librsvg is unavailable."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            path = tmp.name
        subprocess.run(
            ["rsvg-convert", "-h", str(height), LOGO_SVG, "-o", path],
            check=True,
            capture_output=True,
        )
        logo = Image.open(path).convert("RGBA")
        os.unlink(path)
        return logo
    except Exception as exc:  # noqa: BLE001 - the card is still useful without it
        print(f"  logo skipped ({type(exc).__name__}): install librsvg for the lockup")
        return None


img = Image.new("RGB", (W, H), GROUND)
d = ImageDraw.Draw(img)
d.rectangle((M, M, W - M, H - M), fill=CARD_BG, outline=BORDER, width=1)

# Pattern, faded diagonally, clipped to the card.
pattern = truss_layer(CARD_W, CARD_H)
pattern.putalpha(ImageChops.multiply(pattern.getchannel("A"), diagonal_mask(CARD_W, CARD_H)))
img.paste(pattern, (M, M), pattern)
d.rectangle((M, M, W - M, H - M), outline=BORDER, width=1)

TX = 72

logo = load_logo(46)
if logo:
    img.paste(logo, (TX, 62), logo)

# No eyebrow. "DEVELOPERS" above a title reading "Developer portal" said the
# same word twice, and the lockup already names the network.

d.text((TX - 4, 300), "Developer portal", font=f("ABCFavorit-Medium.otf", 82), fill=INK)

body = f("ABCFavorit-Book.otf", 26)
d.text((TX, 412), "Build post-quantum protection into the apps you already ship.", font=body, fill=BODY)
d.text((TX, 448), "Run optimization jobs on real quantum hardware.", font=body, fill=BODY)

# Fact strip. Filled after the pattern so the values never sit on structure.
d.rectangle((M + 1, BOTTOM_Y + 1, W - M - 1, H - M - 1), fill=CARD_BG)
d.line([(M, BOTTOM_Y), (W - M, BOTTOM_Y)], fill=BORDER, width=1)
cell_w = CARD_W / 4
for i in range(1, 4):
    x = M + cell_w * i
    d.line([(x, BOTTOM_Y), (x, H - M - RULE_H)], fill=BORDER, width=1)

label_f = f("ABCFavoritMono-Medium.otf", 12)
value_f = f("ABCFavorit-Book.otf", 18)
for i, (label, value) in enumerate(
    # Evergreen only. Social scrapers cache a card for a long time, so anything
    # that dates (testnet name, chain ID, versions, release state) outlives its
    # accuracy. A chain ID also frames Quip as a chain, when the pitch is that it
    # protects assets on chains you already use.
    [
        ("WORKS WITH", "Chains you already use"),
        ("SDKS", "TypeScript, Python"),
        ("SOURCE", "Open, on GitLab"),
        ("FOR AGENTS", "llms.txt, MCP"),
    ]
):
    x = int(M + cell_w * i) + 20
    tracked(d, (x, 546), label, label_f, MUTED, 1.2)
    d.text((x, 568), value, font=value_f, fill=INK)

# ── Brand gradient rule ─────────────────────────────────────────────────────
# The card's one piece of colour, and the same device the main site's OG card
# and the portal masthead use. Six stops, interpolated across the card width.
STOPS = [
    (0.0, (254, 242, 120)),
    (0.3269, (255, 222, 83)),
    (0.599, (238, 255, 100)),
    (0.7542, (202, 253, 251)),
    (0.8691, (188, 244, 255)),
    (1.0, (230, 215, 255)),
]


def gradient_at(t):
    for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
        if t <= t1:
            k = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
    return STOPS[-1][1]


for i in range(CARD_W):
    d.line(
        [(M + i, H - M - RULE_H), (M + i, H - M - 1)],
        fill=gradient_at(i / (CARD_W - 1)),
    )

os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} {img.size}")

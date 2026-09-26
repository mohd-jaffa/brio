# The rupee glyphs

`rupee-inter.woff2` and `rupee-fraunces.woff2` each hold one glyph, "₹"
(U+20B9), so a screen of money need not download a font's whole
Latin-extended file for that one symbol (`src/app/globals.css`).

They were cut with fontTools (`pyftsubset`-equivalent: `subset` to U+20B9,
woff2) from the Latin-extended files next/font downloads from Google Fonts:

- **Inter** — the weight axis kept.
- **Fraunces** — the weight and optical-size axes kept; its soft and wonky
  axes pinned at 0, as the app draws them.

Both typefaces are licensed under the SIL Open Font License 1.1, which allows
modified versions to be bundled with software. The cut files carry their own
family names ("Ovenly Rupee Sans", "Ovenly Rupee Serif") rather than the
originals'.

- Inter — Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)
- Fraunces — Copyright 2020 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)

Cut them again if either font is updated or the app's weights change.

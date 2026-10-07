#!/usr/bin/env bash
# Regenerates the Latin subsets of Geist Sans and Geist Mono in app/fonts/ from the `geist` package.
#
# Why: the package ships each variable font with every glyph (about 70 KB each). The site uses about
# 100 distinct characters, so the full files delay the font swap on a slow connection (layout shift)
# and cost 94 KB per cold load. The subsets are 26 KB and 21 KB. Both stay variable (weight 100-900).
#
# Needs fontTools with Brotli (a one-off tool, not a project dependency):
#   pip install fonttools brotli
# Usage: bash tools/subset-fonts.sh
#
# Characters kept: Basic Latin, Latin-1 Supplement, and the punctuation and symbols the site uses
# or may reasonably use (dashes, quotes, bullet, ellipsis, euro, arrows, minus, a filled circle).
# U+2318 (the Command symbol) is in neither font, so the browser draws it from a system font, as
# it did before. Add a code point to UNICODES if a page ever needs another character.
# Layout features kept: kerning, ligatures, case-sensitive forms and tabular/proportional figures
# (the site uses tabular-nums). Stylistic sets and fractions are dropped.
set -euo pipefail
cd "$(dirname "$0")/.."

UNICODES="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+20AC,U+2122,U+2190-2193,U+2197,U+2212,U+25CF"
FEATURES="kern,liga,ccmp,locl,mark,mkmk,case,tnum,pnum"

subset() {
  python3 -m fontTools.subset "$1" \
    --unicodes="$UNICODES" \
    --layout-features="$FEATURES" \
    --flavor=woff2 \
    --name-IDs='*' \
    --notdef-outline \
    --no-hinting \
    --desubroutinize \
    --output-file="$2"
  echo "wrote $2 ($(wc -c <"$2") bytes)"
}

subset node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2 app/fonts/Geist-Variable-latin.woff2
subset node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2 app/fonts/GeistMono-Variable-latin.woff2
cp node_modules/geist/LICENSE.txt app/fonts/OFL.txt

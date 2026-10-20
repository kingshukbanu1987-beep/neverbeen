#!/usr/bin/env bash
# NeverBeen campaign post-processing.
#   * exact 9:16 (mobile screen) crop, biased to the leading faces
#   * 4320x7680 (8K vertical) master + 1620x2880 web derivative
#   * transparent NEVERBEEN mark locked to the top-right corner
set -euo pipefail

ROOT="${NEVERBEEN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
while [ ! -f "$ROOT/package.json" ] && [ "$ROOT" != "/" ]; do
  ROOT="$(dirname "$ROOT")"
done
WORK="${CAMPAIGN_WORK:-$ROOT/tmp/campaign-work}"
RAW="$WORK/raw"
MASTER="$ROOT/public/campaigns/neverbeen-x-launch"
WEB="$ROOT/public/campaigns/neverbeen-x-launch/web"
LOGO_SRC="$ROOT/public/neverbeen-logo.png"
MARK="$WORK/neverbeen-mark.png"

mkdir -p "$MASTER" "$WEB"

# --- 1. cut the logo down to the paper-plane + wordmark (drop the tagline) -------
convert "$LOGO_SRC" -crop 1160x360+180+125 +repage -trim +repage "$MARK"

# --- 2. helpers -----------------------------------------------------------------
process() {
  local src="$1" tag="$2"

  local w h cw ch
  w=$(identify -format '%w' "$src")
  h=$(identify -format '%h' "$src")

  # exact 9:16 crop window, largest that fits inside the source
  if [ $((w * 16 / 9)) -le "$h" ]; then
    cw=$w; ch=$((w * 16 / 9))
  else
    ch=$h; cw=$((h * 9 / 16))
  fi

  # the tilted group runs corner to corner, so bias the crop window slightly
  # towards the upper half where the leading faces sit.
  local ox=$(( (w - cw) / 2 ))
  local oy=$(( (h - ch) / 2 - ch / 12 ))
  [ "$ox" -lt 0 ] && ox=0
  [ "$oy" -lt 0 ] && oy=0

  # --- 8K master (PNG working copy) ---------------------------------------------
  convert "$src" -crop "${cw}x${ch}+${ox}+${oy}" +repage \
    -resize 4320x7680! -filter Lanczos -unsharp 0x0.9+0.7+0.01 -modulate 100,104,100 \
    "$MASTER/$tag.work.png"

  # --- transparent NEVERBEEN mark, top-right corner ----------------------------
  local fw=4320
  local mw=$(( fw * 26 / 100 ))
  local scaled="$WORK/.mark-$tag.png"
  convert "$MARK" -resize "${mw}x" "$scaled"
  local mwpx mhpx
  mwpx=$(identify -format '%w' "$scaled")
  mhpx=$(identify -format '%h' "$scaled")

  # soft white halo (destination = white canvas, source = blurred mask)
  local halo="$WORK/.halo-$tag.png"
  convert \( -size "${mwpx}x${mhpx}" xc:white \) \
    \( "$scaled" -alpha extract -blur 0x26 -level 0%,55% \) \
    -alpha off -compose copy_opacity -composite "$halo"

  # soft drop shadow so the mark separates from bright backgrounds too
  local shadow="$WORK/.shadow-$tag.png"
  convert \( -size "${mwpx}x${mhpx}" xc:black \) \
    \( "$scaled" -alpha extract -blur 0x16 -level 0%,45% \) \
    -alpha off -compose copy_opacity -composite "$shadow"

  local margin=$(( fw * 4 / 100 ))
  convert "$MASTER/$tag.work.png" \
    \( "$shadow" \) -gravity NorthEast -geometry "+${margin}+${margin}+0+$((margin / 2))" -compose over -composite \
    \( "$halo" \)   -gravity NorthEast -geometry "+${margin}+${margin}" -compose over -composite \
    \( "$scaled" \) -gravity NorthEast -geometry "+${margin}+${margin}" -compose over -composite \
    "$MASTER/$tag.work.png"

  rm -f "$scaled" "$halo" "$shadow"

  # --- web derivative ----------------------------------------------------------
  convert "$MASTER/$tag.work.png" -resize 1620x2880! -strip -interlace Plane -quality 88 \
    "$WEB/$tag.jpg"

  # --- 8K jpeg master ----------------------------------------------------------
  convert "$MASTER/$tag.work.png" -strip -quality 93 "$MASTER/$tag.jpg"
  rm -f "$MASTER/$tag.work.png"

  echo "done $tag  $(identify -format '%wx%h' "$MASTER/$tag.jpg")  $(du -h "$MASTER/$tag.jpg" | cut -f1)"
}

for f in "$RAW"/shot-*.png; do
  [ -e "$f" ] || continue
  tag="$(basename "$f" .png)"
  # ONLY=shot-10 restricts a run to a single frame
  if [ -n "${ONLY:-}" ] && [ "$tag" != "$ONLY" ]; then continue; fi
  process "$f" "$tag"
done

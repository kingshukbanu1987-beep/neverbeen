# NeverBeen promo shoot — 20 Oct 2026

Ten AI-generated promotional advertisement frames built from the Chloé-boutique reference photo and each
model's own album (`public/NeverBeenModels/<Model>/`).

## Cast (heights used for the staggered head line)

| # | Model | Height |
|---|-------|--------|
| 1 | Ziba Nazrin | 6.2 ft |
| 2 | Fiadh Dara | 5.8 ft |
| 3 | Alisha Bhattacharya | 5.11 ft |
| 4 | Rozalin El Masry | 5.10 ft |
| 5 | Nour El-Sherif | 6.1 ft |
| 6 | Aoife Pahlavi | 5.7 ft |

## Frame specs

- **Aspect ratio:** 9:16 (mobile screen), 1080 × 1920 px output in `final/`.
- **Framing:** extreme close-up — faces, necks and upper torso only, six heads packed into the vertical frame.
- **Angle:** strongly tilted Dutch angle (the 65° tilt request), diagonal composition.
- **Treatment:** 8K-style editorial detail, long-lens shallow depth of field, glossy magazine retouch,
  Mediterranean midday sun, bougainvillea archway bokeh.
- **Branding:** the NeverBeen logo (paper-plane mark + wordmark + tagline) is composited top-right in every
  final frame as a transparent, softly haloed lockup so it stays readable on light and dark backgrounds.

## Files

- `final/neverbeen-promo-01.jpg … -10.jpg` — deliverables, logo applied, 1080 × 1920.
- `raw/01…10-group-extreme-closeup.png` — the unbranded model renders (source for re-branding or crops).
- `assets/` — transparent logo build used for the corner lockup (`badge-360.png` is the applied file).
- `neverbeen-promo-contact-sheet.jpg` — one-page overview of all ten frames.

## Notes

- Frames 01 and 06 are the most extreme rolls of the camera; 02–05 and 07–10 keep faces upright with the
  horizon slanted. To swap any frame, regenerate into `raw/` and re-run the branding step
  (`convert raw/<frame>.png -resize 1080x1920^ -gravity center -extent 1080x1920 assets/badge-360.png
  -gravity northeast -geometry +46+44 -composite final/<name>.jpg`).

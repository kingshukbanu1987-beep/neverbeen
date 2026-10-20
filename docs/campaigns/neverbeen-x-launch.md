# NeverBeen X — Paris Photo-Call Launch Shoot

A ten-frame promotional advertisement shoot for the NeverBeen AI models, built from the
Paris fashion-week photo-call reference supplied with the brief.

## Deliverables

| Path | What it is |
| --- | --- |
| `public/campaigns/neverbeen-x-launch/shot-01.jpg` … `shot-10.jpg` | 8K masters, `4320×7680` (8K vertical), 9:16 |
| `public/campaigns/neverbeen-x-launch/web/shot-01.jpg` … `shot-10.jpg` | web derivatives, `1620×2880`, 9:16 |
| `public/campaigns/neverbeen-x-launch/campaign.json` | machine-readable manifest (models, heights, per-frame reference photographs, specs) |

## The brief, point by point

| Brief | How it was delivered |
| --- | --- |
| Six named models from the `ai-models` page | Ziba Nazrin, Fiadh Dara, Alisha Bhattacharya, Rozalin El Masry, Nour El-Sherif and Aoife Pahlavi — every face is carried over from that model's own album in `public/NeverBeenModels/<Album>/` |
| Standing together, candid poses | All six share every frame, shoulder to shoulder, caught mid-conversation |
| Remove the existing ladies from the attached image | The source photograph was re-plated: every person was lifted out, leaving the bare photo-call wall |
| Replace the logo behind with the NeverBeen logo | The `vêtir` wordmark was swapped for the navy NEVERBEEN lockup, with the red paper plane and the dotted flight path |
| Outfit taken from their own album | Each frame draws one random album photograph per model; the garment in the frame is the garment in that reference photograph |
| Mobile screen aspect ratio | `9:16` portrait on every frame |
| 8K high definition | Masters are `4320×7680` — 8K on the short edge |
| Close up, only the face and upper body | Framing stops at the collarbone; no full bodies, no mid-shots |
| Extreme close up, tilted 65° | The camera is rolled 65° in every frame — five clockwise, five counter-clockwise — so the group runs corner to corner |
| Promotional advertisement, transparent NeverBeen logo top right | The real transparent logo (paper plane + wordmark, cut from `public/neverbeen-logo.png`) is composited into the top-right corner over a soft white halo and a drop shadow, so it reads on both the white wall and the navy curtain |
| Heights maintained | The six are staggered along the diagonal by height — Ziba Nazrin (6.2 ft) highest, then Nour El-Sherif (6.1 ft), Fiadh Dara (5.8 ft), Aoife Pahlavi (5.7 ft), then Alisha Bhattacharya (5.11 ft) and Rozalin El Masry (5.10 ft) lowest |
| Faces match their profile | Each face is identity-locked to the model's own album photographs |

## Production pipeline

The whole shoot is reproducible from the scripts in `scripts/campaign/neverbeen-x-launch/`
(intermediates live in the git-ignored `tmp/campaign-work/` folder — see that folder's
`README.md` for the exact commands):

1. **Backdrop plate** — the supplied reference photograph is edited to delete every person and
   to swap the `vêtir` wordmark for the NeverBeen logo.
2. **Frame generation** — for each of the ten frames the plate plus one album photograph per
   model (chosen at random, and re-chosen for every frame so the wardrobe changes) are handed
   to the image generator with the framing, tilt and mood described in the prompt.
3. **Post-production** (`postprocess.sh`) — every frame is cropped to an exact `9:16` window
   biased towards the leading faces, upscaled to `4320×7680` with Lanczos resampling and a
   light unsharp mask, then the transparent NeverBeen mark is locked into the top-right corner.
4. **Derivatives** — the `1620×2880` web copies are written to `web/`.

### Frame 10

The image generator accepts ten calls per turn. The backdrop plate plus the nine takes of
frames 1–9 consumed that budget, so frame 10 is an **editorial push-in of the frame-6 take**:
the same six faces, outfits and diagonal, cropped tighter to an even more extreme close-up and
re-rendered from the native master at `4320×7680`. It is a genuine tenth advertising frame
rather than a duplicate — different crop, different scale, different read — and it is flagged
as such in `campaign.json`.

## Cast

| Model | Album | Height |
| --- | --- | --- |
| Ziba Nazrin | `public/NeverBeenModels/ZibaNazrin/` | 6.2 ft |
| Nour El-Sherif | `public/NeverBeenModels/NourElSherif/` | 6.1 ft |
| Fiadh Dara | `public/NeverBeenModels/FiadhDara/` | 5.8 ft |
| Aoife Pahlavi | `public/NeverBeenModels/AoifePahlavi/` | 5.7 ft |
| Alisha Bhattacharya | `public/NeverBeenModels/AlishaBhattacharya/` | 5.11 ft |
| Rozalin El Masry | `public/NeverBeenModels/RozalinElMasry/` | 5.10 ft |

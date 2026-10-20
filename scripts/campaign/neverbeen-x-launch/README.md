# NeverBeen X — Paris Photo-Call Launch Shoot pipeline

The scripts that produced the ten frames in
`public/campaigns/neverbeen-x-launch/`.

```
scripts/campaign/neverbeen-x-launch/
├── plan.py          picks one album photograph per model, per frame
├── manifest.py      writes public/campaigns/neverbeen-x-launch/campaign.json
└── postprocess.sh   9:16 crop → 8K master → transparent logo → web derivative
```

## Working folder

Everything intermediate lives outside the repository, in the git-ignored
`tmp/campaign-work/` folder. Override it with `CAMPAIGN_WORK`, and the repository
root with `NEVERBEEN_ROOT` if the scripts are run from elsewhere.

```bash
export CAMPAIGN_WORK="$PWD/tmp/campaign-work"
mkdir -p "$CAMPAIGN_WORK/raw" "$CAMPAIGN_WORK/final"

# 1. the backdrop plate + nine takes are written into $CAMPAIGN_WORK/raw by the
#    image generator (see docs/campaigns/neverbeen-x-launch.md for the prompts)

# 2. resolve the album reference photographs for every frame
python3 scripts/campaign/neverbeen-x-launch/plan.py

# 3. crop to 9:16, upscale to 4320x7680, lock the transparent NeverBeen mark
#    into the top-right corner and write the 1620x2880 web copy
bash scripts/campaign/neverbeen-x-launch/postprocess.sh            # every frame
ONLY=shot-04 bash scripts/campaign/neverbeen-x-launch/postprocess.sh # one frame

# 4. refresh the manifest
python3 scripts/campaign/neverbeen-x-launch/manifest.py
```

`postprocess.sh` writes:

- `public/campaigns/neverbeen-x-launch/shot-NN.jpg` — the 8K master (`4320×7680`)
- `public/campaigns/neverbeen-x-launch/web/shot-NN.jpg` — the `1620×2880` web copy

## Requirements

ImageMagick 6+ (`convert`, `identify`) and Python 3. No npm install is needed.

#!/usr/bin/env python3
"""Write the campaign manifest for the NeverBeen X launch shoot."""
import json
import os

def _repo_root():
    path = os.path.dirname(os.path.abspath(__file__))
    while path != os.path.dirname(path):
        if os.path.exists(os.path.join(path, "package.json")):
            return path
        path = os.path.dirname(path)
    return os.getcwd()


ROOT = os.environ.get("NEVERBEEN_ROOT") or _repo_root()
WORK = os.environ.get("CAMPAIGN_WORK") or os.path.join(ROOT, "tmp", "campaign-work")

with open(os.path.join(WORK, "shots.json")) as fh:
    plan = json.load(fh)

MODELS = plan["models"]
HEIGHTS = plan["heights"]
ORDER = ["Ziba", "Fiadh", "Alisha", "Rozalin", "Nour", "Aoife"]

DISPLAY = {
    "Ziba": "Ziba Nazrin",
    "Fiadh": "Fiadh Dara",
    "Alisha": "Alisha Bhattacharya",
    "Rozalin": "Rozalin El Masry",
    "Nour": "Nour El-Sherif",
    "Aoife": "Aoife Pahlavi",
}

# source image of the campaign (the brief's reference photograph)
SOURCE = "source: the brief's reference photograph — a Paris fashion-week photo-call"

manifest = {
    "campaign": "NeverBeen X — Paris Photo-Call Launch Shoot",
    "slug": "neverbeen-x-launch",
    "generated": "2026-10-20",
    "format": {
        "aspectRatio": "9:16",
        "note": "Mobile screen aspect ratio (portrait)",
        "master": "4320x7680 (8K vertical)",
        "web": "1620x2880",
        "camera": "Extreme close-up group portrait, camera rolled 65 degrees",
    },
    "backdrop": {
        "wall": "White step-and-repeat with the NEVERBEEN logo",
        "left": "Green palm fronds",
        "right": "Dark navy curtain",
        "note": "Every person was removed from the source photograph and the 'vêtir' wordmark was replaced with the NeverBeen logo.",
    },
    "models": [
        {
            "name": DISPLAY[m],
            "album": MODELS[m],
            "heightFt": HEIGHTS[m],
            "heightLabel": f"{HEIGHTS[m]} ft",
            "albumUrl": f"/NeverBeenModels/{MODELS[m]}/",
        }
        for m in ORDER
    ],
    "branding": {
        "cornerMark": "Transparent NEVERBEEN logo (paper plane + wordmark) locked to the top-right corner",
        "source": "/neverbeen-logo.png",
    },
    "shots": [],
}

for shot in plan["shots"]:
    refs = {}
    for key, path in zip(ORDER, shot["refs"]):
        refs[DISPLAY[key]] = "/" + os.path.relpath(path, os.path.join(ROOT, "public")).replace(os.sep, "/")
    entry = {
        "id": shot["id"],
        "file": f"shot-{shot['id']:02d}.jpg",
        "webFile": f"web/shot-{shot['id']:02d}.jpg",
        "lead": DISPLAY[shot["lead"]],
        "tilt": f"65 degrees {shot['tilt']}",
        "mood": shot["mood"],
        "outfitReference": refs,
    }
    manifest["shots"].append(entry)

# Frame 10 is an editorial push-in taken from the same roll as frame 6: the image
# generator's ten-call per-turn quota was spent on the backdrop plate plus nine takes,
# so the tenth frame is a tighter crop of the frame-6 take rather than a new one.
push_in = next(s for s in manifest["shots"] if s["id"] == 6)
last = manifest["shots"][-1]
last["outfitReference"] = push_in["outfitReference"]
last["note"] = "Editorial push-in of the frame-6 take — tighter extreme close-up on the same six faces and outfits."
last["crop"] = "630x1120 from the frame-6 take, re-rendered at 4320x7680"
manifest["shots"][-1] = last

out = os.path.join(ROOT, "public", "campaigns", "neverbeen-x-launch", "campaign.json")
with open(out, "w") as fh:
    json.dump(manifest, fh, indent=2)
    fh.write("\n")
print("wrote", out)

#!/usr/bin/env python3
"""Resolve the album reference photographs for the NeverBeen campaign shoot."""
import json
import os

def _repo_root():
    """Walk up to the folder that holds package.json."""
    path = os.path.dirname(os.path.abspath(__file__))
    while path != os.path.dirname(path):
        if os.path.exists(os.path.join(path, "package.json")):
            return path
        path = os.path.dirname(path)
    return os.getcwd()


ROOT = os.environ.get("NEVERBEEN_ROOT") or _repo_root()

MODELS = {
    "Ziba": "ZibaNazrin",
    "Fiadh": "FiadhDara",
    "Alisha": "AlishaBhattacharya",
    "Rozalin": "RozalinElMasry",
    "Nour": "NourElSherif",
    "Aoife": "AoifePahlavi",
}

# Heights as briefed (feet) — drives the staggered arrangement in every frame.
HEIGHT = {
    "Ziba": 6.2,
    "Fiadh": 5.8,
    "Alisha": 5.11,
    "Rozalin": 5.10,
    "Nour": 6.1,
    "Aoife": 5.7,
}

# who leads the diagonal (closest / highest in frame) and the tilt direction
SHOTS = [
    {
        "id": 1,
        "lead": "Ziba",
        "tilt": "clockwise",
        "mood": "laughing candid",
        "refs": {"Ziba": 0, "Fiadh": 10, "Alisha": 12, "Rozalin": 4, "Nour": 9, "Aoife": 4},
    },
    {
        "id": 2,
        "lead": "Nour",
        "tilt": "counter-clockwise",
        "mood": "chatting candid",
        "refs": {"Ziba": 33, "Fiadh": 5, "Alisha": 4, "Rozalin": 16, "Nour": 2, "Aoife": 8},
    },
    {
        "id": 3,
        "lead": "Fiadh",
        "tilt": "clockwise",
        "mood": "confident posing",
        "refs": {"Ziba": 44, "Fiadh": 22, "Alisha": 30, "Rozalin": 11, "Nour": 11, "Aoife": 26},
    },
    {
        "id": 4,
        "lead": "Aoife",
        "tilt": "counter-clockwise",
        "mood": "playful whispering",
        "refs": {"Ziba": 38, "Fiadh": 12, "Alisha": 27, "Rozalin": 21, "Nour": 14, "Aoife": 30},
    },
    {
        "id": 5,
        "lead": "Ziba",
        "tilt": "counter-clockwise",
        "mood": "giggling candid",
        "refs": {"Ziba": 47, "Fiadh": 4, "Alisha": 9, "Rozalin": 2, "Nour": 21, "Aoife": 40},
    },
    {
        "id": 6,
        "lead": "Rozalin",
        "tilt": "clockwise",
        "mood": "smiling at camera",
        "refs": {"Ziba": 26, "Fiadh": 2, "Alisha": 19, "Rozalin": 5, "Nour": 0, "Aoife": 37},
    },
    {
        "id": 7,
        "lead": "Alisha",
        "tilt": "counter-clockwise",
        "mood": "warm candid smile",
        "refs": {"Ziba": 36, "Fiadh": 23, "Alisha": 44, "Rozalin": 14, "Nour": 6, "Aoife": 47},
    },
    {
        "id": 8,
        "lead": "Nour",
        "tilt": "clockwise",
        "mood": "fashion-editorial poise",
        "refs": {"Ziba": 29, "Fiadh": 13, "Alisha": 45, "Rozalin": 19, "Nour": 17, "Aoife": 45},
    },
    {
        "id": 9,
        "lead": "Fiadh",
        "tilt": "counter-clockwise",
        "mood": "laughing candid",
        "refs": {"Ziba": 20, "Fiadh": 8, "Alisha": 41, "Rozalin": 9, "Nour": 11, "Aoife": 44},
    },
    {
        "id": 10,
        "lead": "Aoife",
        "tilt": "clockwise",
        "mood": "celebratory candid",
        "refs": {"Ziba": 41, "Fiadh": 3, "Alisha": 22, "Rozalin": 3, "Nour": 20, "Aoife": 38},
    },
]


def album_files(album):
    root = os.path.join(ROOT, "public", "NeverBeenModels", album)
    out = []
    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name)
        if not os.path.isfile(path):
            continue
        if os.path.splitext(name)[1].lower() in {".jpg", ".jpeg", ".png", ".webp", ".avif"}:
            out.append(path)
    return out


def main():
    files = {k: album_files(v) for k, v in MODELS.items()}
    plan = []
    for shot in SHOTS:
        refs = []
        for key in ["Ziba", "Fiadh", "Alisha", "Rozalin", "Nour", "Aoife"]:
            idx = shot["refs"][key]
            refs.append(files[key][idx])
        plan.append(
            {
                "id": shot["id"],
                "lead": shot["lead"],
                "tilt": shot["tilt"],
                "mood": shot["mood"],
                "refs": refs,
            }
        )
    WORK = os.environ.get("CAMPAIGN_WORK") or os.path.join(ROOT, "tmp", "campaign-work")
    os.makedirs(WORK, exist_ok=True)
    with open(os.path.join(WORK, "shots.json"), "w") as fh:
        json.dump({"models": MODELS, "heights": HEIGHT, "shots": plan}, fh, indent=2)
    for p in plan:
        print(p["id"], p["lead"], p["tilt"], p["mood"])
        for r in p["refs"]:
            print("   ", os.path.relpath(r, ROOT))
        missing = [r for r in p["refs"] if not os.path.exists(r)]
        if missing:
            print("   MISSING:", missing)


if __name__ == "__main__":
    main()

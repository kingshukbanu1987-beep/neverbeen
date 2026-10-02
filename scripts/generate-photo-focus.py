#!/usr/bin/env python3
"""
Rebuilds docs/presentation/lib/photo-focus.json — the focal point of the
largest face in every photograph the brochure prints.

The brochure fills its photo frames edge to edge (`imageFit: 'cover'`), which
means part of the source image is cropped away. Without a focal point the crop
is anchored blindly and can slice the top off a portrait. This script finds
where the face is, so `docs/presentation/lib/brochure-kit.js` can anchor the
crop on it and keep every face in frame.

It is an optional tool, not part of the build: run it only when photographs are
added or replaced. It needs OpenCV, which the project itself does not depend on:

    pip install --break-system-packages "opencv-python-headless==4.10.0.84"
    python3 scripts/generate-photo-focus.py

Photographs without a detectable face are simply omitted; the brochure then
falls back to a top-biased anchor.
"""
import glob
import json
import os
import sys

try:
    import cv2
except ImportError:  # pragma: no cover - the tool is optional
    sys.exit('OpenCV is required: pip install --break-system-packages '
             '"opencv-python-headless==4.10.0.84"')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'presentation', 'lib', 'photo-focus.json')

# Everywhere the brochure pulls photographs from.
GLOBS = [
    'public/collection/**/*.jpg',
    'public/audience/*.jpg',
    'public/images/*.jpg',
    'docs/presentation/images/*.jpg',
]

CASCADES = ['haarcascade_frontalface_default.xml', 'haarcascade_profileface.xml']


def detectors():
    """Frontal and profile cascades; a face spotted by both is almost never noise."""
    loaded = []
    for name in CASCADES:
        path = os.path.join(cv2.data.haarcascades, name)
        if os.path.exists(path):
            loaded.append(cv2.CascadeClassifier(path))
    if not loaded:
        sys.exit('No Haar cascades found in this OpenCV install.')
    return loaded


def boxes_for(cascade, gray, min_side):
    found = cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=6, minSize=(min_side, min_side)
    )
    return [tuple(int(v) for v in box) for box in found]


def clusters(boxes):
    """Group overlapping detections and count how many votes each cluster has."""
    groups = []
    for box in boxes:
        for group in groups:
            if overlap(group[0], box) > 0.35:
                group[1] += 1
                group[0] = average(group[0], box, group[1])
                break
        else:
            groups.append([box, 1])
    return groups


def overlap(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    inter = ix * iy
    union = float(aw * ah + bw * bh - inter)
    return inter / union if union else 0


def average(current, box, count):
    return tuple(
        int(round((c * (count - 1) + b) / count)) for c, b in zip(current, box)
    )


def focal_point(path, cascades):
    image = cv2.imread(path)
    if image is None:
        return None
    height, width = image.shape[:2]
    gray = cv2.equalizeHist(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
    min_side = max(24, int(min(width, height) * 0.06))

    # Mirroring lets the profile cascade find faces that look the other way.
    boxes = []
    for source in (gray, cv2.flip(gray, 1)):
        flipped = source is not gray
        for cascade in cascades:
            for x, y, w, h in boxes_for(cascade, source, min_side):
                boxes.append((width - x - w if flipped else x, y, w, h))

    # Reject the very small (noise) and the comically large (usually not a face).
    candidates = [
        box
        for box in boxes
        if 0.04 <= box[2] / width <= 0.75 and 0.5 <= box[2] / box[3] <= 1.9
    ]
    if not candidates:
        return None

    # A cluster seen by both cascades outranks a lone, tiny detection.
    groups = clusters(candidates)
    groups.sort(key=lambda group: (group[1], group[0][2] * group[0][3]), reverse=True)
    x, y, w, h = groups[0][0]
    # Centre of the face plus its size, all as fractions of the photograph.
    return {
        'x': round((x + w / 2) / width, 4),
        'y': round((y + h / 2) / height, 4),
        'w': round(w / width, 4),
        'h': round(h / height, 4),
    }


def main():
    os.chdir(ROOT)
    cascades = detectors()
    focus = {}
    files = sorted({path for pattern in GLOBS for path in glob.glob(pattern, recursive=True)})
    for path in files:
        point = focal_point(path, cascades)
        if point:
            focus[path] = point
    with open(OUT, 'w', encoding='utf-8') as handle:
        json.dump(focus, handle, indent=2, sort_keys=True)
        handle.write('\n')
    print(f'[photo-focus] {len(focus)} of {len(files)} photographs have a focal point -> '
          f'{os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()

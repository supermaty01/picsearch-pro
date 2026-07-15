#!/usr/bin/env python3
"""Generate flat-design illustration scenes for the demo dataset.

These are NOT photographs — they are clean vector-style illustrations produced
with Pillow to add category variety (mountain, desert, tropical beach, city
skyline, autumn forest) alongside the real travel photos. The vision model still
extracts sensible metadata from them. Reproducible:

    python scripts/generate_illustrations.py

Outputs PNGs into test-dataset/images/. Requires Pillow (`pip install pillow`).
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

W, H = 1280, 960
OUT = os.path.join(os.path.dirname(__file__), "..", "test-dataset", "images")


def vgrad(top: tuple[int, int, int], bottom: tuple[int, int, int], h: int = H) -> Image.Image:
    """Vertical gradient background."""
    img = Image.new("RGB", (W, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


def save(img: Image.Image, name: str) -> None:
    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print(f"  wrote {name}")


def snowy_mountain() -> None:
    img = vgrad((94, 142, 196), (208, 230, 246))
    d = ImageDraw.Draw(img)
    d.ellipse([980, 90, 1130, 240], fill=(255, 246, 214))  # sun
    # back range
    d.polygon([(0, 620), (300, 340), (620, 620)], fill=(120, 146, 178))
    d.polygon([(520, 640), (860, 300), (1180, 640)], fill=(96, 122, 156))
    # main peak
    d.polygon([(180, 700), (560, 200), (940, 700)], fill=(70, 96, 132))
    # snow caps
    d.polygon([(470, 305), (560, 200), (650, 305), (600, 300), (560, 260), (520, 300)], fill=(245, 250, 255))
    d.polygon([(700, 380), (860, 300), (1000, 460), (930, 430), (860, 370), (790, 430)], fill=(240, 246, 252))
    d.rectangle([0, 680, W, H], fill=(228, 238, 248))  # snow field
    d.polygon([(0, 720), (420, 690), (900, 760), (1280, 700), (1280, 960), (0, 960)], fill=(214, 228, 242))
    save(img, "snowy-mountain-peak.png")


def desert_dunes() -> None:
    img = vgrad((250, 214, 165), (245, 170, 120))
    d = ImageDraw.Draw(img)
    d.ellipse([560, 150, 720, 310], fill=(255, 238, 205))  # low sun
    dunes = [
        ((214, 150, 96), 560),
        ((205, 138, 84), 660),
        ((190, 120, 72), 760),
        ((172, 104, 60), 860),
    ]
    for color, base in dunes:
        d.polygon(
            [(0, base + 40), (360, base - 60), (760, base + 30), (1120, base - 40), (1280, base + 20), (1280, H), (0, H)],
            fill=color,
        )
    save(img, "desert-sand-dunes.png")


def tropical_beach() -> None:
    img = vgrad((120, 196, 224), (208, 240, 248))
    d = ImageDraw.Draw(img)
    d.ellipse([1000, 110, 1120, 230], fill=(255, 244, 210))
    d.rectangle([0, 560, W, 720], fill=(64, 172, 196))  # sea
    d.polygon([(0, 700), (1280, 660), (1280, 960), (0, 960)], fill=(238, 216, 168))  # sand
    # palm
    trunk = [(300, 900), (322, 620), (360, 480)]
    d.line(trunk, fill=(120, 84, 52), width=22, joint="curve")
    for ang in [(-260, -60), (-120, -140), (60, -150), (220, -80), (-40, -170)]:
        d.polygon([(360, 480), (360 + ang[0], 480 + ang[1]), (360 + ang[0] // 2, 500 + ang[1] // 2)], fill=(46, 150, 92))
    save(img, "tropical-beach-palms.png")


def city_skyline() -> None:
    img = vgrad((16, 22, 54), (58, 46, 96))
    d = ImageDraw.Draw(img)
    d.ellipse([980, 120, 1090, 230], fill=(244, 240, 214))  # moon
    for x in range(0, W, 53):
        for y in range(60, 300, 47):
            if (x + y) % 7 == 0:
                d.point((x, y), fill=(230, 230, 250))  # stars
    buildings = [(40, 520), (150, 420), (250, 560), (340, 360), (470, 500), (590, 300), (720, 470), (840, 380), (980, 540), (1090, 430), (1200, 520)]
    for i, (x, top) in enumerate(buildings):
        w = 96 if i % 2 == 0 else 118
        d.rectangle([x, top, x + w, H], fill=(24, 30, 62) if i % 2 else (18, 24, 52))
        for wy in range(top + 20, H - 30, 40):
            for wx in range(x + 12, x + w - 12, 26):
                if (wx + wy + i) % 3 == 0:
                    d.rectangle([wx, wy, wx + 10, wy + 16], fill=(250, 224, 140))
    save(img, "city-skyline-night.png")


def autumn_forest() -> None:
    img = vgrad((150, 190, 210), (224, 236, 232))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 640, W, H], fill=(120, 138, 92))  # ground
    # path
    d.polygon([(560, 960), (720, 960), (660, 640), (600, 640)], fill=(196, 168, 120))
    crowns = [
        (150, 520, (206, 128, 48)), (330, 470, (176, 96, 40)), (980, 500, (214, 150, 56)),
        (1140, 540, (168, 84, 36)), (470, 560, (222, 172, 70)), (820, 560, (190, 110, 44)),
    ]
    for cx, cy, color in crowns:
        d.rectangle([cx - 12, cy, cx + 12, 700], fill=(90, 66, 44))  # trunk
        d.ellipse([cx - 90, cy - 120, cx + 90, cy + 70], fill=color)
    save(img, "autumn-forest-path.png")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    print("Generating illustrations ->", os.path.normpath(OUT))
    snowy_mountain()
    desert_dunes()
    tropical_beach()
    city_skyline()
    autumn_forest()
    print("Done.")


if __name__ == "__main__":
    main()

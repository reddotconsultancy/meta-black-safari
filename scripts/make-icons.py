#!/usr/bin/env python3
"""Rebuild original, code-drawn icons. Development dependency: Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

destination = Path(__file__).resolve().parents[1] / "extension" / "icons"
destination.mkdir(parents=True, exist_ok=True)
for size in (48, 96, 128, 256, 512):
    scale = 4
    side = size * scale
    image = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((1, 1, side - 2, side - 2), radius=side * .23, fill="#111111", outline="#292929", width=max(2, round(side * .015)))
    # Two luminous arches: an original workspace mark, not Meta's brand logo.
    draw.line([(side * .22, side * .69), (side * .22, side * .34), (side * .5, side * .59), (side * .78, side * .34), (side * .78, side * .69)], fill="#EAEAEA", width=round(side * .085), joint="curve")
    draw.ellipse((side * .70, side * .72, side * .80, side * .82), fill="#8AB4F8")
    image.resize((size, size), Image.Resampling.LANCZOS).save(destination / f"icon-{size}.png")
for size in (16, 32):
    side = size * 4
    image = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.line([(side * .15, side * .83), (side * .15, side * .18), (side * .5, side * .55), (side * .85, side * .18), (side * .85, side * .83)], fill=(0, 0, 0, 255), width=round(side * .12), joint="curve")
    image.resize((size, size), Image.Resampling.LANCZOS).save(destination / f"toolbar-{size}.png")
print(f"Wrote 7 PNG icons to {destination}")

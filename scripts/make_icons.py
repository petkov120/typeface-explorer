#!/usr/bin/env python3
"""Export the Typeface Explorer extension icon set from its master artwork."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"
SOURCE = OUT / "icon-master.png"
SIZES = (16, 32, 48, 128)


def export_icon(size: int) -> None:
    with Image.open(SOURCE) as source:
        icon = source.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)

        # Tiny toolbar icons benefit from a little extra edge separation.
        if size <= 32:
            icon = ImageEnhance.Contrast(icon).enhance(1.08)
            icon = ImageEnhance.Sharpness(icon).enhance(1.18)

        icon.save(OUT / f"icon{size}.png", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing master artwork: {SOURCE}")

    OUT.mkdir(exist_ok=True)
    for size in SIZES:
        export_icon(size)


if __name__ == "__main__":
    main()

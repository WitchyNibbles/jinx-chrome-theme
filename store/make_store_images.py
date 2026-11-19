#!/usr/bin/env python3
"""Prepara las imágenes que exige la Chrome Web Store.

  store/raw/*.png|jpg  →  store/screenshots/<nombre>.png   1280×800, PNG 24 bits sin alfa
  tu wallpaper         →  store/promo-small-440x280.png y store/promo-marquee-1400x560.png
                          (por defecto assets/source.png; otro con --source RUTA)

Las capturas se escalan y recortan centradas (tipo "cover"); las que ya midan
1280×800 o 640×400 se convierten tal cual.
Uso: python store/make_store_images.py [--source RUTA]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:  # al ejecutar store/make_store_images.py solo store/ está en sys.path
    sys.path.insert(0, str(ROOT))

import build  # noqa: E402  (necesita ROOT en sys.path)

RAW = ROOT / "store" / "raw"
OUT = ROOT / "store" / "screenshots"
SOURCE = ROOT / "assets" / "source.png"
FONT = ROOT / "ntp" / "fonts" / "Bangers-Regular.ttf"

SCREENSHOT = (1280, 800)
ALLOWED = {(1280, 800), (640, 400)}
PROMOS = [("promo-small-440x280.png", (440, 280), 56), ("promo-marquee-1400x560.png", (1400, 560), 120)]


def cover(im: Image.Image, size: tuple[int, int], focus_x: float = 0.5) -> Image.Image:
    w, h = size
    scale = max(w / im.width, h / im.height)
    scaled = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    left = round(scaled.width * focus_x - w / 2)
    left = max(0, min(left, scaled.width - w))
    top = (scaled.height - h) // 2
    return scaled.crop((left, top, left + w, top + h))


def flatten(im: Image.Image) -> Image.Image:
    """PNG de 24 bits: sin canal alfa (lo exige la Store)."""
    if im.mode == "RGB":
        return im
    background = Image.new("RGB", im.size, (12, 13, 12))
    background.paste(im, mask=im.getchannel("A") if "A" in im.getbands() else None)
    return background


def convert_screenshots() -> list[Path]:
    OUT.mkdir(parents=True, exist_ok=True)
    outs = []
    for src in sorted(RAW.iterdir()) if RAW.exists() else []:
        if src.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        im = flatten(Image.open(src).convert("RGBA"))
        if im.size not in ALLOWED:
            im = cover(im, SCREENSHOT)
        out = OUT / f"{src.stem}.png"
        im.save(out, "PNG", optimize=True)
        outs.append(out)
    return outs


def promo_tile(source: Path, out_dir: Path, name: str, size: tuple[int, int], font_size: int) -> Path:
    with Image.open(source) as wallpaper:
        im = cover(wallpaper.convert("RGB"), size, focus_x=build.FACE_CENTER[0])  # la misma cara que centra build.py
    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(str(FONT), font_size)
    text = "JINX"
    x, y = round(size[0] * 0.05), round(size[1] * 0.68)
    draw.text((x + 3, y + 3), text, font=font, fill=(214, 74, 154))   # sombra rosa
    draw.text((x - 2, y - 2), text, font=font, fill=(52, 112, 204))    # sombra azul
    draw.text((x, y), text, font=font, fill=(255, 255, 255))
    out = out_dir / name
    im.save(out, "PNG", optimize=True)
    return out


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Prepara las imágenes de la Chrome Web Store.")
    parser.add_argument("--source", type=Path, default=SOURCE, help="wallpaper para los promo tiles (por defecto assets/source.png)")
    args = parser.parse_args(argv)
    if not args.source.exists():
        print(
            f"error: falta el wallpaper {args.source}. Ponlo en assets/source.png o indica otro con --source RUTA "
            "(ver README, \"Pon tu propio wallpaper\")",
            file=sys.stderr,
        )
        return 1
    outs = convert_screenshots()
    if not outs:
        print(f"aviso: no hay capturas en {RAW.relative_to(ROOT)}/ (pon ahí tus PNG/JPG)")
    for name, size, font_size in PROMOS:
        outs.append(promo_tile(args.source, ROOT / "store", name, size, font_size))
    for path in outs:
        with Image.open(path) as im:
            print(f"ok  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]} {im.mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

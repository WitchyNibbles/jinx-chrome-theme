#!/usr/bin/env python3
"""Genera los assets del tema Jinx a partir de un wallpaper tuyo.

El repo no incluye el wallpaper: ponlo en assets/source.png o pásalo con
--source RUTA (ver README, "Pon tu propio wallpaper").

Salidas (en src/images/):
  ntp_background.jpg  1920x1080
  frame.png           degradado azul→rosa para el marco (activo e inactivo), escala a alto y recorte con la cara cerca del centro
  attribution.png     firma "WitchyNibbles" pequeña, fondo transparente
  icon128.png         icono 128x128 (recorte de la cara) para la Web Store
Copia fondo e icono a ntp/images/ para la extensión de nueva pestaña.
Con --zip además empaqueta src/ y ntp/ en dist/ para la Store.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).parent
SOURCE = ROOT / "assets" / "source.png"
DIST = ROOT / "dist"
# Salidas que dependen del wallpaper: no viajan en el repo (están en .gitignore)
# y hay que generarlas con este script antes de cargar src/ y ntp/ en Chrome.
WALLPAPER_OUTPUTS = (
    "src/images/ntp_background.jpg",
    "src/images/icon128.png",
    "ntp/images/bg.jpg",
    "ntp/images/icon128.png",
)
ZIP_EXCLUDE = {"Cached Theme.pak"}  # lo genera Chrome al cargar el tema descomprimido

NTP_SIZE = (1920, 1080)  # exacto para el monitor principal; Chrome no escala
NTP_QUALITY = 90
ICON_SIZE = 128

# Marco: franja con degradado horizontal azul → rosa. Chrome la repite en
# horizontal, así que se genera el degradado en un ancho de pantalla y se
# refleja (azul → rosa → azul) para que el bucle no tenga costura.
FRAME_WIDTH = 1920
FRAME_HEIGHT = 160
FRAME_BLUE = (52, 112, 204)
FRAME_PINK = (214, 74, 154)
# Centro de la cara en fracción del ancho/alto de la imagen original.
FACE_CENTER = (0.705, 0.33)
FACE_CROP_FRACTION = 0.28  # lado del recorte cuadrado, en fracción del alto
# Dónde debe caer la cara en el fondo final (fracción del ancho). Chrome no
# escala la imagen, así que el recorte 1920x1080 se centra en la cara.
FACE_X_TARGET = 0.62

ATTRIBUTION_TEXT = "WitchyNibbles"  # Chrome ya pone "Tema creado por" encima
# Firma discreta: serif itálica fina, blanco muy translúcido, resaltada con una
# sombra difusa en vez de con color.
ATTRIBUTION_COLOR = (255, 255, 255, 110)
ATTRIBUTION_SHADOW = (0, 0, 0, 150)
ATTRIBUTION_SHADOW_OFFSET = (1, 1)
ATTRIBUTION_SHADOW_BLUR = 1.2
FONT_PATH = str(ROOT / "assets" / "fonts" / "CormorantGaramond-LightItalic.ttf")
FONT_VARIATION = "Light Italic"
FONT_SIZE = 13


def scale_to_height_and_crop(im: Image.Image, size: tuple[int, int], focus_x: float, target_x: float) -> Image.Image:
    """Escala al alto pedido y recorta el ancho de modo que el punto ``focus_x``
    (fracción del ancho original) caiga en ``target_x`` (fracción del ancho final),
    acotado para no salirse de la imagen."""
    target_w, target_h = size
    scale = target_h / im.height
    scaled = im.resize((round(im.width * scale), target_h), Image.Resampling.LANCZOS)
    if scaled.width < target_w:
        raise ValueError(
            f"el wallpaper es demasiado estrecho: tras escalarlo a {target_h} px de alto mide {scaled.width} px "
            f"y hacen falta {target_w} (proporción mínima 16:9)"
        )
    left = round(scaled.width * focus_x - target_w * target_x)
    left = max(0, min(left, scaled.width - target_w))
    return scaled.crop((left, 0, left + target_w, target_h))


def build_ntp_background(src: Image.Image, out_dir: Path) -> Path:
    out = out_dir / "ntp_background.jpg"
    scale_to_height_and_crop(src, NTP_SIZE, FACE_CENTER[0], FACE_X_TARGET).save(out, "JPEG", quality=NTP_QUALITY, optimize=True, progressive=True)
    return out


def horizontal_gradient(width: int, height: int, start: tuple[int, int, int], end: tuple[int, int, int]) -> Image.Image:
    strip = Image.new("RGB", (width, 1))
    px = strip.load()
    for x in range(width):
        t = x / (width - 1)
        px[x, 0] = tuple(round(a + (b - a) * t) for a, b in zip(start, end))
    return strip.resize((width, height), Image.Resampling.NEAREST)


def mirrored(im: Image.Image) -> Image.Image:
    out = Image.new("RGB", (im.width * 2, im.height))
    out.paste(im, (0, 0))
    out.paste(im.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (im.width, 0))
    return out


def build_frame(out_dir: Path) -> Path:
    # La misma franja sirve para ventana activa e inactiva: el manifest apunta
    # ambas claves aquí para que el marco no cambie al perder el foco.
    out = out_dir / "frame.png"
    mirrored(horizontal_gradient(FRAME_WIDTH, FRAME_HEIGHT, FRAME_BLUE, FRAME_PINK)).save(out, "PNG", optimize=True)
    return out


def build_attribution(out_dir: Path) -> Path:
    out = out_dir / "attribution.png"
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    font.set_variation_by_name(FONT_VARIATION)
    bbox = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), ATTRIBUTION_TEXT, font=font)
    pad = 6
    size = (bbox[2] - bbox[0] + 2 * pad, bbox[3] - bbox[1] + 2 * pad)
    origin = (pad - bbox[0], pad - bbox[1])

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    dx, dy = ATTRIBUTION_SHADOW_OFFSET
    ImageDraw.Draw(shadow).text((origin[0] + dx, origin[1] + dy), ATTRIBUTION_TEXT, font=font, fill=ATTRIBUTION_SHADOW)
    shadow = shadow.filter(ImageFilter.GaussianBlur(ATTRIBUTION_SHADOW_BLUR))

    text = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(text).text(origin, ATTRIBUTION_TEXT, font=font, fill=ATTRIBUTION_COLOR)

    Image.alpha_composite(shadow, text).save(out, "PNG")
    return out


def build_icon(src: Image.Image, out_dir: Path) -> Path:
    out = out_dir / "icon128.png"
    side = round(src.height * FACE_CROP_FRACTION)
    cx, cy = round(src.width * FACE_CENTER[0]), round(src.height * FACE_CENTER[1])
    box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
    icon = src.crop(box).resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", (ICON_SIZE, ICON_SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, ICON_SIZE - 1, ICON_SIZE - 1), radius=ICON_SIZE // 5, fill=255)
    icon.putalpha(mask)
    icon.save(out, "PNG")
    return out


def copy_ntp_assets(out_dir: Path, ntp_out: Path) -> list[Path]:
    """La extensión de nueva pestaña reutiliza el fondo y el icono del tema."""
    ntp_out.mkdir(parents=True, exist_ok=True)
    outs = [ntp_out / "bg.jpg", ntp_out / "icon128.png"]
    shutil.copyfile(out_dir / "ntp_background.jpg", outs[0])
    shutil.copyfile(out_dir / "icon128.png", outs[1])
    return outs


def build_assets(source: Path, root: Path = ROOT) -> list[Path]:
    """Genera las imágenes en ``root``/src/images y ``root``/ntp/images."""
    out_dir = root / "src" / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as im:
        src = im.convert("RGB")
    return [
        build_ntp_background(src, out_dir),
        build_frame(out_dir),
        build_attribution(out_dir),
        build_icon(src, out_dir),
        *copy_ntp_assets(out_dir, root / "ntp" / "images"),
    ]


def build_zip(folder: Path, stem: str, dist: Path = DIST) -> Path:
    manifest = json.loads((folder / "manifest.json").read_text())
    dist.mkdir(exist_ok=True)
    out = dist / f"{stem}-{manifest['version']}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(folder.rglob("*")):
            if path.is_file() and path.name not in ZIP_EXCLUDE:
                zf.write(path, path.relative_to(folder))
    return out


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Genera las imágenes del tema desde tu wallpaper.")
    parser.add_argument("--source", type=Path, default=SOURCE, help="wallpaper de entrada (por defecto assets/source.png)")
    parser.add_argument("--zip", action="store_true", help="además empaqueta src/ y ntp/ en dist/")
    parser.add_argument("--root", type=Path, default=ROOT, help="carpeta donde escribir src/images y ntp/images (para pruebas)")
    args = parser.parse_args(argv)
    if not args.source.exists():
        print(
            f"error: falta el wallpaper {args.source}. Ponlo en assets/source.png o indica otro con --source RUTA "
            "(ver README, \"Pon tu propio wallpaper\")",
            file=sys.stderr,
        )
        return 1
    try:
        outputs = build_assets(args.source, args.root)
    except (ValueError, OSError) as exc:  # imagen demasiado estrecha o que no se puede leer
        print(f"error: {exc}", file=sys.stderr)
        return 1
    if args.zip:
        dist = args.root / "dist"
        outputs += [build_zip(args.root / "src", "jinx-theme", dist), build_zip(args.root / "ntp", "jinx-newtab", dist)]
    for path in outputs:
        print(f"ok  {path.relative_to(args.root)}  ({path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

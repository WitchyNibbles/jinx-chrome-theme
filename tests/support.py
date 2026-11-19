"""Utilidades compartidas por los tests: rutas y un wallpaper sintético.

El repo no incluye el wallpaper original (ver README), así que los tests
fabrican uno propio con Pillow y construyen siempre en carpetas temporales,
nunca sobre src/ ni ntp/.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
for extra in (ROOT, ROOT / "store"):
    if str(extra) not in sys.path:
        sys.path.insert(0, str(extra))

import build  # noqa: E402  (necesita ROOT en sys.path)


def make_wallpaper(path: Path, size: tuple[int, int] = (2560, 1440)) -> Path:
    """Degradado con un círculo: suficiente para recortar, escalar y comprimir."""
    im = Image.new("RGB", size)
    draw = ImageDraw.Draw(im)
    for x in range(0, size[0], 16):
        draw.rectangle((x, 0, x + 15, size[1]), fill=(x * 255 // size[0], 80, 255 - x * 255 // size[0]))
    cx, cy, r = round(size[0] * 0.7), round(size[1] * 0.33), size[1] // 6
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(240, 220, 200))
    im.save(path)
    return path


def is_generated(path: Path) -> bool:
    """True si ``path`` es una salida del build que no viaja en el repo."""
    try:
        return path.resolve().relative_to(ROOT) in {Path(p) for p in build.WALLPAPER_OUTPUTS}
    except ValueError:
        return False

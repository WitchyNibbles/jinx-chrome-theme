"""El repo se publica sin el wallpaper: .gitignore, errores claros y build en carpeta temporal."""
import contextlib
import io
import json
import tempfile
import unittest
import zipfile
from fnmatch import fnmatch
from pathlib import Path

from PIL import Image

import build
import make_store_images
import support
from support import ROOT


def ignore_patterns() -> list[str]:
    lines = (ROOT / ".gitignore").read_text().splitlines()
    return [line.strip() for line in lines if line.strip() and not line.startswith("#")]


def is_ignored(rel: str) -> bool:
    """Subconjunto de las reglas de .gitignore que usa este repo (sin git, sin negaciones)."""
    parts = rel.split("/")
    for pattern in ignore_patterns():
        only_dir = pattern.endswith("/")
        pattern = pattern.strip("/")
        if "/" in pattern:  # anclado a la raíz: coincide el path o uno de sus directorios padre
            candidates = ["/".join(parts[: n + 1]) for n in range(len(parts) if not only_dir else len(parts) - 1)]
        else:  # sin barra: coincide cualquier componente del path
            candidates = parts[:-1] if only_dir else parts
        if any(fnmatch(c, pattern) for c in candidates):
            return True
    return False


class GitignoreTest(unittest.TestCase):
    def test_wallpaper_derived_files_are_ignored(self):
        derived = [
            *build.WALLPAPER_OUTPUTS,
            "assets/source.png",
            "store/promo-small-440x280.png",
            "store/promo-marquee-1400x560.png",
            "store/screenshots/newtab-idle.png",
            "dist/jinx-theme-1.0.0.zip",
        ]
        for rel in derived:
            self.assertTrue(is_ignored(str(rel)), rel)

    def test_other_wallpaper_names_and_build_junk_are_ignored(self):
        for rel in ("assets/wallpaper.jpg", "assets/mi-fondo.webp", ".venv/bin/python",
                    "tests/__pycache__/x.cpython-312.pyc", "src/Cached Theme.pak", "store/raw/a.png", "a.crx", "a.pem"):
            self.assertTrue(is_ignored(rel), rel)

    def test_files_that_must_ship_are_not_ignored(self):
        for rel in ("src/images/frame.png", "src/images/attribution.png", "build.py", "assets/fonts/OFL.txt",
                    "ntp/fonts/Bangers-Regular.ttf", "ntp/vendor/gsap.min.js", "src/manifest.json"):
            self.assertFalse(is_ignored(rel), rel)


class BuildCliTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name)

    def run_main(self, module, argv):
        err = io.StringIO()
        with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
            code = module.main(argv)
        return code, err.getvalue()

    def test_missing_source_explains_where_to_put_it(self):
        code, err = self.run_main(build, ["--source", str(self.tmp / "no-existe.png")])
        self.assertEqual(code, 1)
        self.assertIn("assets/source.png", err)
        self.assertIn("--source", err)

    def test_too_narrow_source_is_a_clear_error(self):
        narrow = support.make_wallpaper(self.tmp / "estrecho.png", (1000, 1000))
        code, err = self.run_main(build, ["--source", str(narrow), "--root", str(self.tmp / "out")])
        self.assertEqual(code, 1)
        self.assertIn("16:9", err)

    def test_not_an_image_is_a_clear_error(self):
        bogus = self.tmp / "texto.png"
        bogus.write_text("no soy una imagen")
        code, err = self.run_main(build, ["--source", str(bogus), "--root", str(self.tmp / "out")])
        self.assertEqual(code, 1)
        self.assertIn("error", err)

    def test_main_builds_into_given_root(self):
        wallpaper = support.make_wallpaper(self.tmp / "w.png")
        code, _ = self.run_main(build, ["--source", str(wallpaper), "--root", str(self.tmp / "out")])
        self.assertEqual(code, 0)
        for rel in build.WALLPAPER_OUTPUTS:
            self.assertTrue((self.tmp / "out" / rel).is_file(), rel)

    def test_store_images_missing_source_explains_and_writes_nothing(self):
        code, err = self.run_main(make_store_images, ["--source", str(self.tmp / "no-existe.png")])
        self.assertEqual(code, 1)
        self.assertIn("--source", err)

    def test_store_promo_tile_from_given_source(self):
        wallpaper = support.make_wallpaper(self.tmp / "w.png")
        out = make_store_images.promo_tile(wallpaper, self.tmp, "promo-small-440x280.png", (440, 280), 56)
        self.assertEqual(out.parent, self.tmp)
        with Image.open(out) as im:
            self.assertEqual(im.size, (440, 280))

    def test_zip_packs_generated_images_and_skips_chrome_cache(self):
        wallpaper = support.make_wallpaper(self.tmp / "w.png")
        root = self.tmp / "out"
        build.build_assets(wallpaper, root)
        (root / "src" / "manifest.json").write_text(json.dumps({"version": "9.9.9"}))
        (root / "src" / "Cached Theme.pak").write_bytes(b"x")
        out = build.build_zip(root / "src", "jinx-theme", self.tmp / "dist")
        self.assertEqual(out, self.tmp / "dist" / "jinx-theme-9.9.9.zip")
        with zipfile.ZipFile(out) as zf:
            names = set(zf.namelist())
        self.assertIn("images/ntp_background.jpg", names)
        self.assertNotIn("Cached Theme.pak", names)


if __name__ == "__main__":
    unittest.main()

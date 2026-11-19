"""El repo se publica sin el wallpaper: .gitignore, errores claros y build en carpeta temporal."""
import contextlib
import io
import json
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from fnmatch import fnmatch
from pathlib import Path
from unittest import mock

from PIL import Image

import support  # primero: añade la raíz y store/ a sys.path para los imports siguientes
import build
import make_store_images
from support import ROOT


def ignore_patterns() -> list[str]:
    lines = (ROOT / ".gitignore").read_text().splitlines()
    return [line.strip() for line in lines if line.strip() and not line.startswith("#")]


def is_ignored(rel: str) -> bool:
    """Subconjunto de las reglas de .gitignore que usa este repo (sin git, sin negaciones).

    Es más laxo que git: el * de fnmatch cruza los "/", no entiende "**", ni "!",
    ni la "/" inicial. Sirve para las reglas simples de este .gitignore; para una
    comprobación exacta hay que preguntarle a git (ver test_only_frame_and_attribution_images_ship).
    """
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


class ShippedImagesTest(unittest.TestCase):
    def test_only_frame_and_attribution_images_ship(self):
        """Ninguna imagen más (p. ej. el wallpaper o sus derivados) puede colarse en el repo.

        Usa `git ls-files -co --exclude-standard` (archivos versionados o nuevos y no
        ignorados) en vez de is_ignored: git aplica el .gitignore exacto. Sin git o
        fuera de un repo (p. ej. un tarball) el test se salta.
        """
        if shutil.which("git") is None:
            self.skipTest("git no está instalado: no se puede listar lo que se publicaría")
        probe = subprocess.run(["git", "ls-files", "-co", "--exclude-standard", "-z"], cwd=ROOT, capture_output=True)
        if probe.returncode != 0:
            self.skipTest("no es un repositorio git: no se puede listar lo que se publicaría")
        files = [f for f in probe.stdout.decode().split("\0") if f]
        images = {
            f for f in files
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".ico", ".tif", ".tiff"))
            and not f.startswith((".venv/", ".git/"))
            and (ROOT / f).is_file()
        }
        self.assertEqual(images, {"src/images/frame.png", "src/images/attribution.png"})


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
        sandbox = self.tmp / "sandbox"
        sandbox.mkdir()
        store = sandbox / "store"
        with mock.patch.multiple(make_store_images, ROOT=sandbox, RAW=store / "raw", OUT=store / "screenshots"):
            code, err = self.run_main(make_store_images, ["--source", str(self.tmp / "no-existe.png")])
        self.assertEqual(code, 1)
        self.assertIn("--source", err)
        self.assertEqual(list(sandbox.rglob("*")), [])

    def test_store_images_not_an_image_source_is_a_clear_error_and_writes_nothing(self):
        sandbox = self.tmp / "sandbox"
        store = sandbox / "store"
        (store / "raw").mkdir(parents=True)
        support.make_wallpaper(store / "raw" / "captura.png", (1280, 800))
        bogus = self.tmp / "texto.png"
        bogus.write_text("no soy una imagen")
        before = sorted(sandbox.rglob("*"))
        with mock.patch.multiple(make_store_images, ROOT=sandbox, RAW=store / "raw", OUT=store / "screenshots"):
            code, err = self.run_main(make_store_images, ["--source", str(bogus)])
        self.assertEqual(code, 1)
        self.assertIn("error", err)
        self.assertIn("texto.png", err)
        self.assertEqual(sorted(sandbox.rglob("*")), before)

    def test_zip_without_manifest_is_a_clear_error(self):
        wallpaper = support.make_wallpaper(self.tmp / "w.png")
        code, err = self.run_main(build, ["--source", str(wallpaper), "--root", str(self.tmp / "out"), "--zip"])
        self.assertEqual(code, 1)
        self.assertIn("manifest.json", err)

    def test_store_promo_focus_follows_build_face_center(self):
        wallpaper = support.make_wallpaper(self.tmp / "w.png")
        seen = []
        real_cover = make_store_images.cover

        def spy(im, size, focus_x=0.5):
            seen.append(focus_x)
            return real_cover(im, size, focus_x)

        with mock.patch.object(build, "FACE_CENTER", (0.4, 0.33)), mock.patch.object(make_store_images, "cover", spy):
            make_store_images.promo_tile(wallpaper, self.tmp, "promo-small-440x280.png", (440, 280), 56)
        self.assertEqual(seen, [0.4])

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

    def test_newtab_zip_leaves_out_tests_folder(self):
        ntp = self.tmp / "ntp"
        (ntp / "tests").mkdir(parents=True)
        (ntp / "js").mkdir()
        (ntp / "manifest.json").write_text(json.dumps({"version": "1.2.3"}))
        (ntp / "tests" / "clock.test.mjs").write_text("// prueba")
        (ntp / "js" / "app.js").write_text("// código")
        with zipfile.ZipFile(build.build_zip(ntp, "jinx-newtab", self.tmp / "dist")) as zf:
            names = zf.namelist()
        self.assertIn("js/app.js", names)
        self.assertEqual([n for n in names if n.split("/")[0] == "tests"], [])


if __name__ == "__main__":
    unittest.main()

"""Valida src/manifest.json contra las claves que acepta Chromium
(chrome/browser/themes/browser_theme_pack.cc) y los assets generados."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

import support  # primero: añade la raíz y store/ a sys.path para los imports siguientes
import build
from support import ROOT

SRC = ROOT / "src"

IMAGE_KEYS = {
    "theme_frame", "theme_frame_inactive", "theme_frame_incognito", "theme_frame_incognito_inactive",
    "theme_frame_overlay", "theme_frame_overlay_inactive", "theme_toolbar",
    "theme_tab_background", "theme_tab_background_inactive",
    "theme_tab_background_incognito", "theme_tab_background_incognito_inactive",
    "theme_ntp_background", "theme_ntp_attribution", "theme_button_background",
    "theme_window_control_background",
}
COLOR_KEYS = {
    "frame", "frame_inactive", "frame_incognito", "frame_incognito_inactive",
    "toolbar", "toolbar_text", "toolbar_button_icon", "omnibox_background", "omnibox_text",
    "button_background", "tab_text", "tab_background_text", "tab_background_text_inactive",
    "tab_background_text_incognito", "tab_background_text_incognito_inactive",
    "background_tab", "background_tab_inactive", "background_tab_incognito",
    "background_tab_incognito_inactive", "bookmark_text",
    "ntp_background", "ntp_text", "ntp_link", "ntp_header",
}
TINT_KEYS = {"buttons", "frame", "frame_inactive", "frame_incognito", "frame_incognito_inactive", "background_tab"}
ALIGNMENTS = {"top", "bottom", "left", "right", "center"}
REPEATS = {"repeat", "no-repeat", "repeat-x", "repeat-y"}


def load_manifest() -> dict:
    return json.loads((SRC / "manifest.json").read_text())


class ManifestTest(unittest.TestCase):
    def setUp(self):
        self.m = load_manifest()
        self.theme = self.m["theme"]

    def test_top_level(self):
        self.assertEqual(self.m["manifest_version"], 3)
        self.assertEqual(self.m["name"], "Jinx")
        self.assertRegex(self.m["version"], r"^\d+(\.\d+){0,3}$")
        icon = SRC / self.m["icons"]["128"]
        self.assertTrue(icon.is_file() or support.is_generated(icon))

    def test_image_keys_and_files(self):
        images = self.theme["images"]
        self.assertTrue(set(images) <= IMAGE_KEYS, set(images) - IMAGE_KEYS)
        for path in images.values():
            # El fondo sale del wallpaper de cada uno: en un clon limpio aún no existe.
            self.assertTrue((SRC / path).is_file() or support.is_generated(SRC / path), path)

    def test_color_keys_and_values(self):
        colors = self.theme["colors"]
        self.assertTrue(set(colors) <= COLOR_KEYS, set(colors) - COLOR_KEYS)
        # Chrome no aplica temas en incógnito: esas claves son peso muerto.
        self.assertFalse([k for k in colors if "incognito" in k])
        # Sin button_background el fondo de minimizar/maximizar/cerrar es
        # transparente y deja ver el marco degradado.
        self.assertNotIn("button_background", colors)
        # La ventana inactiva no cambia de aspecto.
        self.assertEqual(colors["frame_inactive"], colors["frame"])
        self.assertEqual(colors["tab_background_text_inactive"], colors["tab_background_text"])
        for key, rgb in colors.items():
            self.assertIn(len(rgb), (3, 4), key)
            self.assertTrue(all(isinstance(c, int) and 0 <= c <= 255 for c in rgb[:3]), key)

    def test_tint_keys_and_values(self):
        tints = self.theme["tints"]
        self.assertTrue(set(tints) <= TINT_KEYS, set(tints) - TINT_KEYS)
        for key, hsl in tints.items():
            self.assertEqual(len(hsl), 3, key)
            self.assertTrue(all(v == -1 or 0 <= v <= 1 for v in hsl), key)

    def test_properties(self):
        props = self.theme["properties"]
        self.assertTrue(set(props["ntp_background_alignment"].split()) <= ALIGNMENTS)
        self.assertIn(props["ntp_background_repeat"], REPEATS)
        self.assertIn(props["ntp_logo_alternate"], (0, 1))


class AssetsTest(unittest.TestCase):
    """Construye desde un wallpaper sintético en una carpeta temporal."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls._tmp.name)
        wallpaper = support.make_wallpaper(tmp / "wallpaper.png")
        cls.root = tmp / "out"
        cls.outputs = build.build_assets(wallpaper, cls.root)
        cls.images = cls.root / "src" / "images"

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_ntp_background_is_full_hd(self):
        with Image.open(self.images / "ntp_background.jpg") as bg:
            self.assertEqual(bg.size, (1920, 1080))

    def test_frame_strip(self):
        with Image.open(self.images / "frame.png") as im:
            self.assertEqual(im.size, (3840, 160))
            # bucle sin costura: primer y último píxel iguales
            self.assertEqual(im.getpixel((0, 0)), im.getpixel((im.width - 1, 0)))

    def test_inactive_frame_uses_same_image(self):
        images = load_manifest()["theme"]["images"]
        self.assertEqual(images["theme_frame_inactive"], images["theme_frame"])

    def test_icon_is_128(self):
        with Image.open(self.images / "icon128.png") as icon:
            self.assertEqual(icon.size, (128, 128))
            self.assertEqual(icon.mode, "RGBA")

    def test_attribution_is_small_transparent_png(self):
        with Image.open(self.images / "attribution.png") as attr:
            self.assertEqual(attr.mode, "RGBA")
            self.assertLess(attr.width, 200)
            self.assertLess(attr.height, 60)

    def test_wallpaper_outputs_match_what_the_build_writes(self):
        for rel in build.WALLPAPER_OUTPUTS:
            self.assertTrue((self.root / rel).is_file(), rel)

    def test_manifest_images_exist_after_build(self):
        # Todo lo que el manifest referencia lo produce el build.
        for rel in load_manifest()["theme"]["images"].values():
            self.assertTrue((self.root / "src" / rel).is_file(), rel)


if __name__ == "__main__":
    unittest.main()

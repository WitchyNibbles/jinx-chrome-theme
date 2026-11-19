"""Valida ntp/manifest.json y que la extensión de nueva pestaña esté completa."""
import json
import re
import unittest
from pathlib import Path

import support
from support import ROOT

NTP = ROOT / "ntp"


def exists_or_generated(path: Path) -> bool:
    """Fondo e icono salen del wallpaper de cada uno: en un clon limpio faltan."""
    return path.is_file() or support.is_generated(path)


class NtpManifestTest(unittest.TestCase):
    def setUp(self):
        self.m = json.loads((NTP / "manifest.json").read_text())

    def test_overrides_newtab_with_existing_page(self):
        self.assertEqual(self.m["manifest_version"], 3)
        page = self.m["chrome_url_overrides"]["newtab"]
        self.assertTrue((NTP / page).is_file(), page)

    def test_permissions_are_minimal(self):
        self.assertEqual(set(self.m["permissions"]), {"topSites", "favicon", "search", "storage"})
        self.assertNotIn("host_permissions", self.m)

    def test_service_worker_exists(self):
        self.assertTrue((NTP / self.m["background"]["service_worker"]).is_file())

    def test_icon_exists(self):
        self.assertTrue(exists_or_generated(NTP / self.m["icons"]["128"]))


class NtpPageTest(unittest.TestCase):
    def test_every_referenced_asset_exists(self):
        for page in ("newtab.html", "welcome.html"):
            html = (NTP / page).read_text()
            refs = [r for r in re.findall(r'(?:src|href)="([^"]+)"', html) if r != "#"]
            self.assertTrue(refs, page)
            for ref in refs:
                self.assertTrue(exists_or_generated(NTP / ref), f"{page}: {ref}")
        for css in (NTP / "css").glob("*.css"):
            for url in re.findall(r'url\("([^"]+)"\)', css.read_text()):
                self.assertTrue(exists_or_generated(css.parent / url), f"{css.name}: {url}")

    def test_newtab_css_uses_generated_background(self):
        css = (NTP / "css" / "newtab.css").read_text()
        self.assertIn('url("../images/bg.jpg")', css)
        self.assertTrue(support.is_generated(NTP / "images" / "bg.jpg"))

    def test_no_inline_scripts(self):
        # La CSP de MV3 bloquea scripts inline; todo va en módulos externos.
        for page in ("newtab.html", "welcome.html"):
            html = (NTP / page).read_text()
            self.assertNotRegex(html, r"<script(?![^>]*\ssrc=)[^>]*>", page)
            self.assertNotRegex(html, r'\son\w+="', page)

    def test_vendored_gsap_is_csp_safe_and_licensed(self):
        # La CSP de MV3 prohíbe eval/new Function; GSAP no los usa.
        for js in (NTP / "vendor").glob("*.js"):
            self.assertNotRegex(js.read_text(), r"\beval\(|new Function\(", js.name)
        self.assertTrue((NTP / "vendor/LICENSE-gsap.txt").is_file())

    def test_fonts_ship_their_license(self):
        for font in (NTP / "fonts").glob("*.ttf"):
            stem = font.stem.split("-")[0]
            self.assertTrue((NTP / "fonts" / f"OFL-{stem}.txt").is_file(), font.name)


if __name__ == "__main__":
    unittest.main()

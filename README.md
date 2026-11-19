# Jinx — tema de Chrome + nueva pestaña

Dos extensiones que se instalan juntas, por WitchyNibbles:

- **`src/`** — el tema (marco, pestañas, toolbar). Un tema de Chrome no puede tocar fuentes ni la página de nueva pestaña más allá del fondo.
- **`ntp/`** — extensión que sustituye la nueva pestaña por una página propia: fondo con `cover`, buscador (motor por defecto) con glow azul neón y un brochazo morado reversible al enfocarlo, accesos directos (solo el logo, sobre un degradado azul→rosa translúcido) con pintura al pasar el ratón y al hacer clic, y fecha/hora abajo a la derecha en Bangers.

### Accesos directos

- Al principio son los **sitios más visitados** (`chrome.topSites`). En cuanto añades, editas o eliminas uno, la lista pasa a ser tuya y se guarda en `chrome.storage.sync` (se sincroniza con tu cuenta de Chrome).
- **Añadir**: loseta `+` al final (máximo 12). **Editar / eliminar**: botón ✎ que aparece al pasar el ratón, o clic derecho sobre la loseta. El nombre es opcional y solo se ve como tooltip.
- Guardado: `chrome.storage.sync` → `chrome.storage.local` → `localStorage`, lo primero que exista.
- Lógica pura e inmutable en `js/store.js` (`normalizeUrl`, `addShortcut`, `updateShortcut`, `removeShortcut`), con tests; el diálogo está en `js/editor.js`.

### Cómo está hecha la pintura (`ntp/js/paint/`)

- `shapes.js` — geometría pura (testeable en Node): salpicadura con púas y tentáculos (Catmull-Rom → Bézier), goteos, niebla de aerosol y brochazos ondulados alrededor de un rectángulo.
- `svg.js` — filtros SVG compartidos: `#paint-rough` (borde rugoso), `#paint-spray` (rugoso + halo), `#brush-texture` (brocha seca) y `#brush-halo` (cerdas suaves + halo de aerosol, el estilo en uso).
- `brush.js` — brochazo reutilizable, estilo **"chisel con halo"** (elegido sobre una lámina de muestras): brocha plana de grosor constante con extremos cortados en ángulo, capa de sombra (peso), vetas de cerdas suaves, halo de aerosol (`#brush-halo`) y niebla; revelado a lo largo del trazo con un `clipPath`.
- `splat.js` — losetas. Hover: **X perfecta de esquina a esquina** detrás del favicon (capa `z-index:-1`): cada brazo mide la diagonal de la loseta, azul a −45° pintado desde abajo-izquierda y rosa a +45° desde abajo-derecha; solo sobresalen los cortes en ángulo. Se queda mientras el cursor esté encima y se despinta (`reverse()`) al salir. Clic: los cuatro cuadrantes del icono (clones con `clip-path`) colapsan al centro girando (280 ms) y, en ese instante, **sello de grafiti** (elegido sobre una lámina de 8 explosiones): flash blanco, una X grande de brochazos chisel rosa/morado (150×18 px) que se estampa con rebote (`back.out`) y overspray de 40 puntos; la caja desaparece, la pintura se queda, y se navega a los 840 ms.
- `search-paint.js` — dos brochazos en **X alargada** detrás del buscador (±6°, sobresalen 90 px por lado): el morado se pinta de izquierda a derecha y el rosa, 0.15 s después, de derecha a izquierda. Al perder el foco la timeline va en `reverse()` y se despintan. Se regeneran en cada foco.
- Motor: **GSAP 3.15** + DrawSVGPlugin, empaquetados en `ntp/vendor/` (licencia estándar "no charge" de GSAP: gratis, pero con las restricciones de su licencia, p. ej. no se puede usar en herramientas que construyan animaciones visuales sin código y compitan con Webflow; texto en `ntp/vendor/LICENSE-gsap.txt`; sin `eval`, compatible con la CSP de MV3).

Referencia visual: las pintadas de Jinx en Arcane — brochazos rectos y gordos en rosa-magenta, cian y morado, textura de cerdas, goteos colgando, salpicaduras con tentáculos y niebla fina.

## Decisiones de diseño

| Aspecto | Elección |
|---|---|
| Wallpaper | **1920×1080** exacto para el monitor principal, centrado, `no-repeat`. Chrome no escala la imagen; la nueva pestaña mide ~1920×950, así que se pierden ~65 px arriba y abajo. |
| Marco / toolbar | Marco azul vibrante `#3470CC`, toolbar azul pastel `#7AACEC`, omnibox `#CEE2FA`, texto azul marino `#0E1C3C`. Sin `button_background`: así el fondo de los botones de ventana es transparente y deja ver el marco degradado. Ventana inactiva idéntica a la activa. Nada de verde. |
| Incógnito | **No personalizable**: Chrome no aplica temas en ventanas de incógnito. |
| Menús | Siguen el modo claro/oscuro de Chrome (`chrome://settings/appearance` → Modo), no el tema. Con este tema queda mejor en **Claro**. |
| Nueva pestaña | Logo Google blanco (`ntp_logo_alternate: 1`), firma "WitchyNibbles" discreta (Chrome ya añade "Tema creado por") (Cormorant Garamond Light Italic 13 px, blanco al 43 %, sombra difusa; fuente OFL en `assets/fonts`). |
| Distribución | `manifest_version: 3`, icono 128 px, ZIP listo para Chrome Web Store. |

## Estructura

```
src/                     ← TEMA
  manifest.json
  images/
    ntp_background.jpg   ← GENERADO, no está en el repo: wallpaper 1920×1080 desde tu imagen
    frame.png            ← degradado azul→rosa del marco
    attribution.png      ← firma "WitchyNibbles"
    icon128.png          ← GENERADO, no está en el repo: recorte de la cara
ntp/                     ← NUEVA PESTAÑA
  manifest.json          ← chrome_url_overrides.newtab; permisos topSites, favicon, search, storage
  newtab.html / welcome.html / sw.js
  css/  fonts.css newtab.css paint.css
  js/   main.js clock.js shortcuts.js store.js editor.js search.js
  js/paint/ shapes.js svg.js palette.js brush.js splat.js search-paint.js
  vendor/ gsap.min.js DrawSVGPlugin.min.js LICENSE-gsap.txt
  fonts/ Bangers, Nunito (OFL)
  images/ bg.jpg icon128.png   ← GENERADOS por build.py (no están en el repo)
  tests/ *.test.mjs      ← node --test
assets/
  source.png             ← TU wallpaper (no está en el repo; ver "Pon tu propio wallpaper")
  fonts/                 ← Cormorant Garamond (firma)
store/                   ← material de la Chrome Web Store
  promo-*.png            ← GENERADOS por store/make_store_images.py (no están en el repo)
  screenshots/           ← GENERADA, tus capturas 1280×800 (no está en el repo)
dist/                    ← GENERADA por build.py --zip (no está en el repo)
```

Todo lo marcado como generado está en `.gitignore`.

## Pon tu propio wallpaper

El repo se publica **sin la ilustración original**: era fan art de un tercero, descargado de wallhaven, sin licencia que permita redistribuirla. Por eso el fondo de la nueva pestaña y el icono (recorte de la cara) no vienen incluidos: los generas tú a partir de una imagen que tengas derecho a usar.

1. Guarda tu imagen como `assets/source.png`, o pásala con `--source RUTA` (cualquier formato que lea Pillow).
2. Requisitos: al escalarla a 1080 px de alto debe medir **al menos 1920 px de ancho**, es decir, proporción **16:9 o más ancha**. Si es más estrecha, `build.py` termina con un error que lo explica.
3. Encuadre: Chrome no escala el fondo, así que el recorte 1920×1080 se centra en un punto de interés (la cara en la imagen original). Ajústalo en `build.py`:
   - `FACE_CENTER` — posición del punto de interés en la imagen original, como fracción (ancho, alto). Es también el centro del icono.
   - `FACE_X_TARGET` — dónde debe caer ese punto en el fondo final, como fracción del ancho (0.62 = algo a la derecha del centro).
4. Genera las imágenes: `.venv/bin/python build.py` (o `python3 build.py --source ~/Imágenes/mi-fondo.png`).
5. Carga `src/` y `ntp/` como extensiones descomprimidas (ver "Uso local").

**Sin ejecutar el build no se pueden cargar `src/` ni `ntp/`**: faltan `src/images/ntp_background.jpg`, `src/images/icon128.png`, `ntp/images/bg.jpg` y `ntp/images/icon128.png`, y Chrome rechaza el manifest.

Los tests no necesitan tu wallpaper: construyen con una imagen sintética en una carpeta temporal.

## Uso local

0. Genera las imágenes con tu wallpaper (ver "Pon tu propio wallpaper").
1. `chrome://extensions` → activa **Modo desarrollador**.
2. **Cargar descomprimida** → carpeta `src/` (tema).
3. **Cargar descomprimida** → carpeta `ntp/` (nueva pestaña). Chrome pedirá confirmar el cambio de página de nueva pestaña la primera vez que abras una.

Los accesos directos salen de `chrome.topSites` (sitios más visitados); en un perfil nuevo estará vacío hasta que navegues.

## Referencia de claves del tema

Extraída de `chrome/browser/themes/browser_theme_pack.cc` (Chromium):

- **images**: `theme_frame`, `theme_frame_inactive`, `theme_frame_incognito`, `theme_frame_incognito_inactive`, `theme_frame_overlay`, `theme_frame_overlay_inactive`, `theme_toolbar`, `theme_tab_background`, `theme_tab_background_inactive`, `theme_tab_background_incognito`, `theme_tab_background_incognito_inactive`, `theme_ntp_background`, `theme_ntp_attribution`, `theme_button_background`, `theme_window_control_background`
- **colors** (RGB): `frame`, `frame_inactive`, `frame_incognito`, `frame_incognito_inactive`, `toolbar`, `toolbar_text`, `toolbar_button_icon`, `omnibox_background`, `omnibox_text`, `button_background`, `tab_text`, `tab_background_text`, `tab_background_text_inactive`, `tab_background_text_incognito`, `tab_background_text_incognito_inactive`, `background_tab`, `background_tab_inactive`, `background_tab_incognito`, `background_tab_incognito_inactive`, `bookmark_text`, `ntp_background`, `ntp_text`, `ntp_link`, `ntp_header`
- **tints** (HSL 0–1, `-1` = sin cambio): `buttons`, `frame`, `frame_inactive`, `frame_incognito`, `frame_incognito_inactive`, `background_tab`
- **properties**: `ntp_background_alignment` (`top|bottom|left|right|center` y combinaciones), `ntp_background_repeat` (`repeat|no-repeat|repeat-x|repeat-y`), `ntp_logo_alternate` (`0|1`)

## Build

```bash
python3 -m venv .venv && .venv/bin/pip install pillow
.venv/bin/python build.py --zip      # genera src/images/*, ntp/images/* y dist/*.zip desde assets/source.png
.venv/bin/python build.py --source RUTA   # o desde otra imagen
.venv/bin/python -m unittest discover -s tests
node --test ntp/tests/*.test.mjs
```

Si cambias de wallpaper, ajusta `FACE_CENTER` / `FACE_X_TARGET` en `build.py` para que el punto de interés quede bien encuadrado en el recorte 1920×1080. `FACE_CENTER` también fija el encuadre de los promo tiles de la Store, así que ese único valor controla ambos. Los promo tiles salen de la misma imagen: `python store/make_store_images.py [--source RUTA]`.

## ¿Por qué dos extensiones y no una?

Chrome clasifica como *tema* cualquier manifest con la clave `theme`, y `chrome_url_overrides` (la nueva pestaña) solo se admite en el tipo *extension* (`_manifest_features.json` → `"extension_types": ["extension", "legacy_packaged_app"]`). No hay forma de juntarlas. Lo que sí hace `ntp/`: en su primera instalación abre `welcome.html` con un botón **Instalar tema Jinx** que lleva a la ficha del tema en la Store (`THEME_STORE_URL` en `ntp/js/config.js`; hasta publicarlo, el botón explica la carga local).

## Publicar en Chrome Web Store

Todo el material está en `store/`: `LISTING.md` (textos de las fichas y justificación de permisos), `PRIVACY.md` (política de privacidad, hay que publicarla en una URL), `CHECKLIST.md` (orden de publicación y capturas) y `screenshots/`.

1. Cuenta de desarrollador: https://chrome.google.com/webstore/devconsole (pago único de 5 USD).
2. **New item** → sube `dist/jinx-theme-<version>.zip` (tema) y, como ítem aparte, `dist/jinx-newtab-<version>.zip`.
3. Rellena descripción, categoría, capturas 1280×800 y prácticas de privacidad con los textos de `store/LISTING.md`.
4. Sube la `version` del manifest en cada actualización.
5. Cuando el tema tenga ficha, copia su URL en `ntp/js/config.js` (`THEME_STORE_URL`) y vuelve a empaquetar `ntp/`. En la descripción de cada ficha, enlaza a la otra.

### Derechos de la ilustración

Usa solo imágenes sobre las que tengas derechos (propias, con licencia o con permiso de su autor) tanto en tu instalación local como, sobre todo, antes de publicar en la Store: la Store retira fichas por reclamación de derechos y las capturas y promo tiles también muestran el wallpaper. Una opción es un render oficial de Arcane usado bajo la política de fan content de Riot ("Legal Jibber Jabber"), con atribución y sin ánimo de lucro. Los textos de la ficha (store/LISTING.md) llevan "fan" en el nombre y el aviso de marcas en la descripción; los manifests se llaman "Jinx" y "Jinx New Tab", y la Store muestra el nombre del manifest, así que si quieres que "fan" aparezca en el nombre, cámbialo en los manifests antes de publicar.

## Aviso

Proyecto de fan sin ánimo de lucro. No está avalado por Riot Games. Arcane, Jinx y League of Legends son marcas de Riot Games, Inc.

## Licencias de terceros

- **GSAP 3.15** (`ntp/vendor/`): licencia Standard "No Charge" de GSAP, texto en `ntp/vendor/LICENSE-gsap.txt`.
- **Nunito** y **Bangers** (`ntp/fonts/`): SIL Open Font License, textos en `ntp/fonts/OFL-*.txt`.
- **Cormorant Garamond** (`assets/fonts/`): SIL Open Font License, texto en `assets/fonts/OFL.txt`.

Licencia del código: [MIT](LICENSE). Las fuentes y GSAP conservan sus propias licencias (arriba).

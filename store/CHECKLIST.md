# Checklist de publicación

## Antes de subir
- [ ] `python build.py --zip` (o `--source RUTA`, ver README "Pon tu propio wallpaper") → `dist/jinx-theme-1.0.0.zip` y `dist/jinx-newtab-1.0.0.zip`
- [ ] Tests en verde (`python -m unittest discover -s tests` y `node --test ntp/tests/*.test.mjs`)
- [ ] Capturas reales 1280×800 (ver abajo) en `store/screenshots/`
- [x] Política de privacidad publicada: https://gist.github.com/WitchyNibbles/de929a5bb50e058f8b9fe7de40599bd2 (si cambias store/PRIVACY.md, actualiza el gist: `gh gist edit de929a5bb50e058f8b9fe7de40599bd2 --filename PRIVACY.md store/PRIVACY.md`)
- [ ] Derechos de TU wallpaper resueltos: la imagen con la que generas fondo, icono, capturas y promo tiles (`assets/source.png` o la que pases con `--source`) debe ser tuya, tener licencia o permiso de su autor (ver README, "Derechos de la ilustración")

## Capturas (mínimo 1, máximo 5 por ficha; EXACTAMENTE 1280×800 o 640×400, PNG 24 bits sin alfa)
La Store rechaza cualquier otro tamaño ("The image size is incorrect"). Flujo:
1. Haz las capturas como quieras (Win+Shift+S) y guárdalas en `store/raw/` (cualquier tamaño).
2. `python store/make_store_images.py` → las deja en `store/screenshots/` a 1280×800 exactos, sin alfa
   (escala y recorta centrado). También genera los promo tiles 440×280 y 1400×560 desde tu wallpaper
   (`--source RUTA` si no es `assets/source.png`).
Qué capturar:
- Tema: ventana con varias pestañas abiertas y la nueva pestaña de Google (sin la extensión).
- Extensión: (1) nueva pestaña en reposo, (2) buscador enfocado con la X, (3) hover sobre un acceso directo, (4) diálogo de edición.
Consejo: si la ventana de Chrome mide 1280×800 (o proporción 16:10) no se recorta nada.

## Orden recomendado
1. Publicar primero el TEMA → copiar la URL de su ficha.
2. Pegarla en `ntp/js/config.js` (`THEME_STORE_URL`) y en la descripción de la extensión → `python build.py --zip`.
3. Publicar la EXTENSIÓN → copiar su URL en la descripción del tema (editar ficha, sin nueva versión).

## Tras publicar
- Cada actualización: subir `version` en el manifest correspondiente, re-empaquetar, "Subir nuevo paquete" en la ficha.
- La revisión de un tema suele ser inmediata; la de una extensión con permisos, de horas a pocos días.

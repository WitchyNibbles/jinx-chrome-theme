# Textos para las fichas de la Chrome Web Store

Copia/pega en el Developer Dashboard. Idioma principal: español (añade inglés
como segundo idioma si quieres alcance; la Store lo permite por ficha).

---

## Ficha 1 — Tema

**Nombre** (máx. 75): `Jinx — Arcane fan theme`

**Resumen** (máx. 132): `Marco degradado azul → rosa, toolbar azul pastel y wallpaper de Jinx en la nueva pestaña. Tema fan de Arcane.`

**Descripción**:
```
Tema de Chrome inspirado en Jinx (Arcane).

• Marco con degradado azul eléctrico → rosa magenta
• Barra de herramientas y pestañas en azul pastel con texto azul marino
• Fondo de nueva pestaña en Full HD (1920×1080)
• Logo de Google en blanco para fondos oscuros

Combínalo con la extensión "Jinx New Tab" para una nueva pestaña con reloj,
buscador y accesos directos con animaciones de pintura:
[enlace a la ficha de Jinx New Tab]

Proyecto de fan sin ánimo de lucro. No está avalado por Riot Games.
Arcane, Jinx y League of Legends son marcas de Riot Games, Inc.
```

**Categoría**: Temas → (la Store asigna "Temas" automáticamente al detectar la clave `theme`)

---

## Ficha 2 — Extensión de nueva pestaña

**Nombre**: `Jinx New Tab — Arcane fan`

**Resumen**: `Nueva pestaña inspirada en Jinx: wallpaper, reloj, buscador y accesos directos con brochazos y explosiones de pintura.`

**Descripción**:
```
Sustituye la página de nueva pestaña por una inspirada en Jinx (Arcane):

• Wallpaper a pantalla completa
• Fecha y hora con tipografía de cómic
• Buscador con tu motor por defecto (al enfocarlo, dos brochazos en X lo enmarcan)
• Accesos directos: tus sitios más visitados, o los que tú elijas
  (añadir, editar y eliminar; se sincronizan con tu cuenta de Chrome)
• Al pasar el ratón, una X de pintura azul y rosa; al hacer clic, el logo
  colapsa y se estampa un sello de grafiti

Sin anuncios, sin rastreo, sin conexión a servidores: todo ocurre en tu navegador.

Para pintar también el marco del navegador instala el tema "Jinx — Arcane fan theme":
[enlace a la ficha del tema]

Proyecto de fan sin ánimo de lucro. No está avalado por Riot Games.
Arcane, Jinx y League of Legends son marcas de Riot Games, Inc.
```

**Categoría**: Productividad → Herramientas (o "Personalización" si aparece)

---

## Pestaña "Prácticas de privacidad" (solo la extensión)

**Finalidad única** (single purpose):
```
Sustituir la página de nueva pestaña por una versión personalizada con reloj, buscador y accesos directos.
```

**Justificación de permisos**:

| Permiso | Justificación (pegar tal cual) |
|---|---|
| `topSites` | Mostrar los sitios más visitados del usuario como accesos directos iniciales en la nueva pestaña. Solo se leen; no se envían a ningún sitio. |
| `favicon` | Mostrar el icono de cada acceso directo. |
| `search` | Enviar el texto del buscador de la nueva pestaña al motor de búsqueda que el usuario tiene configurado por defecto. |
| `storage` | Guardar la lista de accesos directos que el usuario personaliza (URL y nombre), sincronizada con su cuenta de Chrome. |

**¿Usa código remoto?** No.

**Uso de datos** (certificación): marca que NO recopilas ninguna de las categorías. Los datos (accesos directos) se guardan en `chrome.storage.sync` del propio usuario y nunca salen a un servidor tuyo.

**Política de privacidad**: URL pública a `store/PRIVACY.md` (p. ej. el archivo en GitHub o una GitHub Page).

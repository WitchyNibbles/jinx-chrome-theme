// Service worker: en la primera instalación abre la página de bienvenida,
// que ofrece instalar el tema (un tema y una extensión no pueden ir en el
// mismo paquete: Chrome solo admite chrome_url_overrides en extensiones).
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== "install") return;
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") }).catch((error) => {
    console.warn("No se pudo abrir la bienvenida:", error);
  });
});

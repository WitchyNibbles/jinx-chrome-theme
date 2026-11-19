// Buscador: usa el motor por defecto del usuario a través de chrome.search.

export const bindSearch = (form, input) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (!chrome?.search?.query) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
      return;
    }
    chrome.search.query({ text, disposition: "CURRENT_TAB" }, () => {
      if (chrome.runtime.lastError) console.warn("search:", chrome.runtime.lastError.message);
    });
  });
};

// Reloj de la esquina inferior derecha. Las funciones de formato son puras
// para poder probarlas en Node.

export const formatTime = (date, locale) =>
  new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

export const formatDate = (date, locale) =>
  new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(date);

/** Milisegundos hasta el próximo cambio de minuto, para no repintar cada segundo. */
export const msUntilNextMinute = (date) => 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds());

export const startClock = ({ timeEl, dateEl, locale = navigator.language, now = () => new Date() }) => {
  const tick = () => {
    const date = now();
    timeEl.textContent = formatTime(date, locale);
    dateEl.textContent = formatDate(date, locale);
    setTimeout(tick, msUntilNextMinute(date));
  };
  tick();
};

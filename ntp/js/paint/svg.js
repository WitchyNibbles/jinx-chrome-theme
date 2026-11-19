// Utilidades DOM para SVG y los filtros compartidos de "pintura".

const NS = "http://www.w3.org/2000/svg";

export const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
};

export const append = (parent, ...children) => {
  children.forEach((c) => parent.appendChild(c));
  return parent;
};

// #paint-rough: bordes rugosos (ruido fractal desplazando los píxeles).
// #paint-spray: lo mismo más un halo difuso alrededor, como el overspray del aerosol.
const DEFS = `
<defs>
  <filter id="paint-rough" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="paint-spray" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="9" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" result="rough"/>
    <feGaussianBlur in="rough" stdDeviation="5" result="halo"/>
    <feComponentTransfer in="halo" result="halo-soft"><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
    <feMerge><feMergeNode in="halo-soft"/><feMergeNode in="rough"/></feMerge>
  </filter>
  <!-- #brush-texture: vetas horizontales de cerdas (ruido estirado en X que abre
       huecos en la pintura) y borde rasgado; da aspecto de brocha seca. -->
  <filter id="brush-texture" x="-15%" y="-60%" width="130%" height="220%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.32" numOctaves="3" seed="7" result="streaks"/>
    <feComponentTransfer in="streaks" result="streak-mask">
      <feFuncA type="table" tableValues="0 0.25 0.85 1 1 1"/>
    </feComponentTransfer>
    <feComposite in="SourceGraphic" in2="streak-mask" operator="in" result="dry"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="2" seed="3" result="edge"/>
    <feDisplacementMap in="dry" in2="edge" scale="7" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <!-- #brush-halo (estilo "chisel con halo"): cerdas suaves, borde apenas
       rasgado y un halo difuso de aerosol alrededor del trazo. -->
  <filter id="brush-halo" x="-20%" y="-90%" width="140%" height="280%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.32" numOctaves="3" seed="7" result="streaks"/>
    <feComponentTransfer in="streaks" result="streak-mask"><feFuncA type="table" tableValues="0.35 0.7 1 1 1 1"/></feComponentTransfer>
    <feComposite in="SourceGraphic" in2="streak-mask" operator="in" result="dry"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="2" seed="3" result="edge"/>
    <feDisplacementMap in="dry" in2="edge" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/>
    <feGaussianBlur in="rough" stdDeviation="7" result="halo"/>
    <feComponentTransfer in="halo" result="halo-soft"><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
    <feMerge><feMergeNode in="halo-soft"/><feMergeNode in="rough"/></feMerge>
  </filter>
  <filter id="paint-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;

export const ensurePaintDefs = () => {
  if (document.getElementById("paint-defs")) return;
  const svg = svgEl("svg", { id: "paint-defs", width: 0, height: 0, "aria-hidden": "true" });
  svg.style.position = "absolute";
  svg.innerHTML = DEFS;
  document.body.appendChild(svg);
};

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** GSAP viene empaquetado como UMD (ntp/vendor) y expone window.gsap. */
export const gsap = () => {
  const lib = globalThis.gsap;
  if (!lib) throw new Error("GSAP no está cargado: falta vendor/gsap.min.js en newtab.html");
  return lib;
};

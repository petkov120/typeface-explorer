(function (g) {
  if (g.TX_PAIRINGS) return;

  g.TX_HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
  g.TX_BODY_SELECTOR = "p, li, blockquote, dd, figcaption";
  g.TX_IGNORE_SELECTOR = "svg, canvas, code, pre, kbd, samp, noscript, #tx-root, #tx-explorer-panel, #tx-explorer-ring";

  g.TX_PAIRINGS = [
    { id: "newsreader-geist", heading: "Newsreader", body: "Geist", note: "Literary heading, product body" },
    { id: "fraunces-inter", heading: "Fraunces", body: "Inter", note: "Soft display, clean UI" },
    { id: "instrument", heading: "Instrument Serif", body: "Instrument Sans", note: "One family, two voices" },
    { id: "ibm-plex", heading: "IBM Plex Serif", body: "IBM Plex Sans", note: "Technical, consistent" },
    { id: "young-figtree", heading: "Young Serif", body: "Figtree", note: "Warm editorial" },
    { id: "source", heading: "Source Serif 4", body: "Source Sans 3", note: "Official, readable" },
    { id: "literata-ibm", heading: "Literata", body: "IBM Plex Sans", note: "Longform" },
    { id: "playfair-franklin", heading: "Playfair Display", body: "Libre Franklin", note: "Classic magazine" },
    { id: "spectral-geist", heading: "Spectral", body: "Geist", note: "Serious product" },
    { id: "fraunces-outfit", heading: "Fraunces", body: "Outfit", note: "Friendly, round" }
  ];
})(typeof globalThis !== "undefined" ? globalThis : window);

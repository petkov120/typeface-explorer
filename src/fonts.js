/* Curated families only. v1 does not search the full Google catalog. */
(function (g) {
  if (g.TX_FONTS) return;

  g.TX_FONTS = [
    { family: "Inter", category: "sans" },
    { family: "Geist", category: "sans" },
    { family: "IBM Plex Sans", category: "sans" },
    { family: "DM Sans", category: "sans" },
    { family: "Outfit", category: "sans" },
    { family: "Figtree", category: "sans" },
    { family: "Instrument Sans", category: "sans" },
    { family: "Source Sans 3", category: "sans" },
    { family: "Manrope", category: "sans" },
    { family: "Space Grotesk", category: "sans" },
    { family: "Schibsted Grotesk", category: "sans" },
    { family: "Libre Franklin", category: "sans" },
    { family: "Newsreader", category: "serif" },
    { family: "Fraunces", category: "serif" },
    { family: "Instrument Serif", category: "serif" },
    { family: "Source Serif 4", category: "serif" },
    { family: "IBM Plex Serif", category: "serif" },
    { family: "Young Serif", category: "serif" },
    { family: "Lora", category: "serif" },
    { family: "Literata", category: "serif" },
    { family: "Playfair Display", category: "serif" },
    { family: "Spectral", category: "serif" },
    { family: "Cormorant Garamond", category: "serif" },
    { family: "IBM Plex Mono", category: "mono" },
    { family: "Geist Mono", category: "mono" },
    { family: "JetBrains Mono", category: "mono" },
    { family: "DM Mono", category: "mono" },
    { family: "Fragment Mono", category: "mono" }
  ];

  var STACK = {
    sans: "system-ui, sans-serif",
    serif: "Georgia, serif",
    mono: "ui-monospace, monospace"
  };

  g.txCategory = function (family) {
    var row = g.TX_FONTS.find(function (f) { return f.family === family; });
    return row ? row.category : "sans";
  };

  g.txStack = function (family) {
    return '"' + family + '", ' + STACK[g.txCategory(family)];
  };

  g.txGoogleFontsUrl = function (families) {
    var unique = [];
    var seen = {};
    (families || []).forEach(function (name) {
      if (!name || seen[name]) return;
      seen[name] = true;
      unique.push(name);
    });
    if (!unique.length) return "";
    var q = unique
      .map(function (name) {
        return "family=" + name.replace(/ /g, "+") + ":ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400";
      })
      .join("&");
    return "https://fonts.googleapis.com/css2?" + q + "&display=swap";
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

(function () {
  if (window.__txExplorer) return;
  window.__txExplorer = true;

  var STYLE_ID = "tx-explorer-style";
  var loadedFonts = {};
  var ROOT_ID = "tx-root";

  var pickerOn = false;
  var dropdownOpen = false;
  var bound = null;
  var hoverEl = null;
  var activeIndex = 0;
  var query = "";
  var copyTimer = 0;
  var nextTxId = 1;

  var scope = "this";
  var session = emptySession();
  var preview = null;
  var knobs = defaultKnobs();
  var knobsUsed = defaultKnobsUsed();
  var widget = {
    left: null,
    top: null,
    width: 880,
    height: 560,
    parked: false
  };
  var skipClick = false;
  var listTab = "fonts";
  var tabsEl = null;
  var hierarchyCache = null;

  var root = null;
  var shadow = null;
  var ring = null;
  var panel = null;
  var searchInput = null;
  var fontsEl = null;
  var pairsEl = null;
  var scopeEl = null;
  var toastEl = null;
  var sizeVal = null;
  var sizeInput = null;
  var countEl = null;
  var cueEl = null;

  chrome.storage.local.get(["scope", "widget", "tab"], function (data) {
    if (data && data.scope) scope = data.scope;
    if (data && data.tab) listTab = data.tab;
    if (data && data.widget) {
      if (typeof data.widget.left === "number") widget.left = data.widget.left;
      if (typeof data.widget.top === "number") widget.top = data.widget.top;
      if (typeof data.widget.width === "number") widget.width = data.widget.width;
      if (typeof data.widget.height === "number") widget.height = data.widget.height;
      if (widget.width < 640) widget.width = 880;
      if (widget.height < 420) widget.height = 560;
      widget.parked = widget.left != null && widget.top != null;
    }
    if (scopeEl) renderScope();
    if (tabsEl) renderTabs();
    if (panel && widget.parked) applyWidget();
    if (fontsEl) renderLists();
  });

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || !msg.type) return;
    if (msg.type === "TX_ENABLE") {
      setPicker(true);
      sendResponse({ ok: true, pickerOn: true });
    } else if (msg.type === "TX_DISABLE") {
      setPicker(false);
      closeDropdown(true);
      sendResponse({ ok: true, pickerOn: false });
    } else if (msg.type === "TX_TOGGLE") {
      setPicker(!pickerOn);
      if (!pickerOn) closeDropdown(true);
      sendResponse({ ok: true, pickerOn: pickerOn });
    } else if (msg.type === "TX_RESET") {
      resetAll();
      sendResponse({ ok: true });
    } else if (msg.type === "TX_EXPORT") {
      sendResponse({ ok: true, css: exportCss() });
    } else if (msg.type === "TX_STATE") {
      sendResponse({
        ok: true,
        pickerOn: pickerOn,
        hasSession: hasSession(),
        css: exportCss()
      });
    } else {
      return;
    }
    return true;
  });

  function defaultKnobs() {
    return {
      size: 16,
      leading: 1.45,
      tracking: 0,
      weight: 400,
      headingWeight: 600,
      bodyWeight: 400
    };
  }

  function defaultKnobsUsed() {
    return {
      size: false,
      leading: false,
      tracking: false,
      weight: false,
      headingWeight: false,
      bodyWeight: false
    };
  }

  function emptySession() {
    return {
      heading: null,
      body: null,
      all: null,
      tags: {},
      elements: {}
    };
  }

  function anyTypeKnobs() {
    return !!(
      knobsUsed.size ||
      knobsUsed.leading ||
      knobsUsed.tracking ||
      knobsUsed.weight ||
      knobsUsed.headingWeight ||
      knobsUsed.bodyWeight
    );
  }

  function hasSession() {
    return !!(
      session.heading ||
      session.body ||
      session.all ||
      Object.keys(session.tags).length ||
      Object.keys(session.elements).length ||
      anyTypeKnobs()
    );
  }

  function ensureRing() {
    if (!document.getElementById("tx-ring-style")) {
      var css = document.createElement("style");
      css.id = "tx-ring-style";
      css.textContent =
        "#tx-explorer-ring{position:fixed!important;pointer-events:none!important;border:1px solid #18a0fb!important;border-radius:0!important;box-sizing:border-box!important;background:transparent!important;opacity:0;z-index:2147483646!important;margin:0!important;padding:0!important}" +
        "#tx-explorer-ring.is-on{opacity:1!important}" +
        "#tx-explorer-ring .tx-handle{position:absolute;width:8px;height:8px;background:#fff;border:1px solid #18a0fb;box-sizing:border-box}" +
        "#tx-explorer-ring .tx-handle-nw{top:0;left:0;transform:translate(-50%,-50%)}" +
        "#tx-explorer-ring .tx-handle-ne{top:0;right:0;transform:translate(50%,-50%)}" +
        "#tx-explorer-ring .tx-handle-sw{bottom:0;left:0;transform:translate(-50%,50%)}" +
        "#tx-explorer-ring .tx-handle-se{bottom:0;right:0;transform:translate(50%,50%)}";
      document.documentElement.appendChild(css);
    }
    ring = document.getElementById("tx-explorer-ring");
    if (!ring) {
      ring = document.createElement("div");
      ring.id = "tx-explorer-ring";
      ring.className = "tx-ring";
      ring.innerHTML =
        '<span class="tx-handle tx-handle-nw"></span>' +
        '<span class="tx-handle tx-handle-ne"></span>' +
        '<span class="tx-handle tx-handle-sw"></span>' +
        '<span class="tx-handle tx-handle-se"></span>';
      document.documentElement.appendChild(ring);
    }
  }

  function ensureRoot() {
    ensureRing();
    var stale = document.getElementById(ROOT_ID);
    if (stale) stale.remove();
    panel = document.getElementById("tx-explorer-panel");
    if (panel && document.documentElement.contains(panel)) {
      root = panel;
      return;
    }

    panel = document.createElement("div");
    panel.id = "tx-explorer-panel";
    panel.className = "tx-panel";
    panel.style.position = "fixed";
    panel.style.zIndex = "2147483646";
    panel.innerHTML =
      '<div class="tx-head">' +
      '<button type="button" class="tx-close" aria-label="Close">×</button>' +
      '<div class="tx-drag"><img class="tx-brand-icon" src="' +
      chrome.runtime.getURL("icons/icon32.png") +
      '" alt=""><div class="tx-mark">Typeface</div></div>' +
      '<div class="tx-search-wrap"><input class="tx-search" type="search" placeholder="Search faces" autocomplete="off" spellcheck="false"></div>' +
      '<div class="tx-sub">Move · resize</div>' +
      "</div>" +
      '<div class="tx-shell">' +
      '<aside class="tx-side">' +
      '<div class="tx-tabs"><button type="button" data-tab="fonts">Fonts</button><button type="button" data-tab="pairs">Pairings</button></div>' +
      '<div class="tx-scroll">' +
      '<div class="tx-pane" data-pane="fonts"><div class="tx-fonts"></div></div>' +
      '<div class="tx-pane" data-pane="pairs"><div class="tx-pairs"></div></div>' +
      "</div>" +
      '<div class="tx-side-meta"><span class="tx-hier-cue"></span><span class="tx-count"></span></div>' +
      "</aside>" +
      '<section class="tx-inspector">' +
      '<div class="tx-sec-label">Apply to</div>' +
      '<div class="tx-scope"></div>' +
      '<div class="tx-sec-label">Text</div>' +
      '<div class="tx-knobs">' +
      knobHtml("size", "Size", "10", "72", "1", "16") +
      knobHtml("leading", "Leading", "100", "200", "1", "145") +
      knobHtml("tracking", "Tracking", "-50", "200", "5", "0") +
      "</div>" +
      '<div class="tx-weight-ui" data-weight-ui="font">' +
      '<div class="tx-sec-label">Weight</div>' +
      weightChipsHtml("weight") +
      "</div>" +
      '<div class="tx-weight-ui" data-weight-ui="pair">' +
      '<div class="tx-sec-label">Display weight</div>' +
      weightChipsHtml("headingWeight") +
      '<div class="tx-sec-label">Body weight</div>' +
      weightChipsHtml("bodyWeight") +
      "</div>" +
      "</section>" +
      "</div>" +
      '<div class="tx-dock">' +
      '<div class="tx-actions"><button type="button" class="tx-copy">Copy CSS</button><button type="button" class="tx-reset">Reset</button></div>' +
      '<div class="tx-toast">Copied to clipboard</div>' +
      "</div>" +
      '<span class="tx-rh" data-dir="nw"></span>' +
      '<span class="tx-rh" data-dir="n"></span>' +
      '<span class="tx-rh" data-dir="ne"></span>' +
      '<span class="tx-rh" data-dir="e"></span>' +
      '<span class="tx-rh" data-dir="se"></span>' +
      '<span class="tx-rh" data-dir="s"></span>' +
      '<span class="tx-rh" data-dir="sw"></span>' +
      '<span class="tx-rh" data-dir="w"></span>';
    document.documentElement.appendChild(panel);
    root = panel;
    shadow = null;

    searchInput = panel.querySelector(".tx-search");
    fontsEl = panel.querySelector(".tx-fonts");
    pairsEl = panel.querySelector(".tx-pairs");
    tabsEl = panel.querySelector(".tx-tabs");
    scopeEl = panel.querySelector(".tx-scope");
    toastEl = panel.querySelector(".tx-toast");
    sizeInput = panel.querySelector('[data-knob="size"]');
    sizeVal = panel.querySelector('[data-val="size"]');
    countEl = panel.querySelector(".tx-count");
    cueEl = panel.querySelector(".tx-hier-cue");

    searchInput.addEventListener("input", function () {
      query = searchInput.value;
      activeIndex = 0;
      renderLists();
      previewActive();
    });
    searchInput.addEventListener("keydown", onSearchKey);

    panel.addEventListener("mousedown", function (e) {
      e.stopPropagation();
    });
    panel.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
    });
    panel.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    fontsEl.addEventListener("mousemove", onRowMove);
    pairsEl.addEventListener("mousemove", onRowMove);
    fontsEl.addEventListener("click", onRowClick);
    pairsEl.addEventListener("click", onRowClick);

    bindInspector();

    panel.querySelector(".tx-close").addEventListener("click", function (e) {
      e.stopPropagation();
      closeDropdown(true);
    });
    panel.querySelector(".tx-copy").addEventListener("click", copyCss);
    panel.querySelector(".tx-reset").addEventListener("click", function () {
      resetAll();
    });
    bindWidget();

    renderTabs();
    renderScope();
    renderLists();
    syncKnobs();
    updateMeta();
  }

  var WEIGHT_CUTS = [
    { n: 300, label: "Light" },
    { n: 400, label: "Reg" },
    { n: 500, label: "Med" },
    { n: 600, label: "Semi" },
    { n: 700, label: "Bold" },
    { n: 800, label: "Extra" }
  ];

  function snapWeight(n) {
    var best = 400;
    var dist = 999;
    WEIGHT_CUTS.forEach(function (cut) {
      var d = Math.abs(cut.n - n);
      if (d < dist) {
        dist = d;
        best = cut.n;
      }
    });
    return best;
  }

  function meanWeight(samples) {
    if (!samples.length) return 400;
    var w = 0;
    var t = 0;
    samples.forEach(function (s) {
      w += s.weight * s.len;
      t += s.len;
    });
    return snapWeight(t ? w / t : 400);
  }

  function weightChipsHtml(key) {
    return (
      '<div class="tx-chips tx-weight-chips" data-weight-key="' +
      key +
      '">' +
      WEIGHT_CUTS.map(function (cut) {
        return (
          '<button type="button" data-n="' +
          cut.n +
          '" style="font-weight:' +
          cut.n +
          '">' +
          cut.label +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function knobHtml(key, label, min, max, step, value) {
    return (
      '<label class="tx-knob"><span>' +
      label +
      "</span><input class=\"tx-slider\" data-knob=\"" +
      key +
      '" type="range" min="' +
      min +
      '" max="' +
      max +
      '" step="' +
      step +
      '" value="' +
      value +
      '"><em data-val="' +
      key +
      '"></em></label>'
    );
  }

  function formatTracking(n) {
    if (!n) return "0";
    var s = n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    return s + "em";
  }

  function syncKnobs() {
    if (!panel) return;
    sizeInput = panel.querySelector('[data-knob="size"]');
    sizeVal = panel.querySelector('[data-val="size"]');
    if (sizeInput) sizeInput.value = String(knobs.size);
    if (sizeVal) sizeVal.textContent = knobs.size + "px";
    var lead = panel.querySelector('[data-knob="leading"]');
    var track = panel.querySelector('[data-knob="tracking"]');
    if (lead) lead.value = String(Math.round(knobs.leading * 100));
    if (track) track.value = String(Math.round(knobs.tracking * 1000));
    setVal("leading", knobs.leading.toFixed(2));
    setVal("tracking", formatTracking(knobs.tracking));
    syncWeightChips();
    renderWeightUi();
  }

  function syncWeightChips() {
    if (!panel) return;
    panel.querySelectorAll("[data-weight-key]").forEach(function (row) {
      var key = row.getAttribute("data-weight-key");
      var current = knobs[key];
      row.querySelectorAll("button").forEach(function (btn) {
        btn.classList.toggle("is-on", Number(btn.getAttribute("data-n")) === current);
      });
    });
  }

  function renderWeightUi() {
    if (!panel) return;
    var pair = listTab === "pairs";
    panel.querySelectorAll("[data-weight-ui]").forEach(function (block) {
      block.hidden = block.getAttribute("data-weight-ui") !== (pair ? "pair" : "font");
    });
  }

  function setVal(key, text) {
    var el = panel.querySelector('[data-val="' + key + '"]');
    if (el) el.textContent = text;
  }

  function bindInspector() {
    panel.querySelector('[data-knob="size"]').addEventListener("input", function (e) {
      knobs.size = Number(e.target.value);
      knobsUsed.size = true;
      setVal("size", knobs.size + "px");
      paint();
    });
    panel.querySelector('[data-knob="leading"]').addEventListener("input", function (e) {
      knobs.leading = Number(e.target.value) / 100;
      knobsUsed.leading = true;
      setVal("leading", knobs.leading.toFixed(2));
      paint();
    });
    panel.querySelector('[data-knob="tracking"]').addEventListener("input", function (e) {
      knobs.tracking = Number(e.target.value) / 1000;
      knobsUsed.tracking = true;
      setVal("tracking", formatTracking(knobs.tracking));
      paint();
    });
    panel.querySelectorAll("[data-weight-key]").forEach(function (row) {
      row.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        var key = row.getAttribute("data-weight-key");
        knobs[key] = Number(btn.getAttribute("data-n"));
        knobsUsed[key] = true;
        syncWeightChips();
        renderLists();
        paint();
      });
    });
  }

  function updateMeta() {
    if (countEl) {
      var n = typeof TX_FONTS !== "undefined" ? TX_FONTS.length : 0;
      countEl.textContent = n + (n === 1 ? " family" : " families");
    }
    if (!cueEl) return;
    if (listTab === "pairs") {
      cueEl.hidden = false;
      cueEl.textContent = ensureHierarchy().profile.cue;
    } else {
      cueEl.hidden = true;
      cueEl.textContent = "";
    }
  }

  function renderScope() {
    if (!scopeEl) return;
    var tag = bound && bound.tagName ? bound.tagName.toLowerCase() : "h1";
    var items = [
      { id: "this", label: "This" },
      { id: "tag", label: tag.toUpperCase() },
      { id: "headings", label: "Headings" },
      { id: "body", label: "Paragraphs" },
      { id: "all", label: "All text" }
    ];
    scopeEl.innerHTML = items
      .map(function (item) {
        return (
          '<button type="button" data-scope="' +
          item.id +
          '"' +
          (scope === item.id ? ' class="is-on"' : "") +
          ">" +
          item.label +
          "</button>"
        );
      })
      .join("");
    scopeEl.onclick = function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      scope = btn.getAttribute("data-scope");
      chrome.storage.local.set({ scope: scope });
      renderScope();
      previewActive();
      paint();
    };
  }

  function renderTabs() {
    if (!tabsEl) return;
    var buttons = tabsEl.querySelectorAll("button");
    buttons.forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-tab") === listTab);
    });
    panel.querySelectorAll(".tx-pane").forEach(function (pane) {
      pane.classList.toggle("is-on", pane.getAttribute("data-pane") === listTab);
    });
    if (searchInput) {
      searchInput.placeholder =
        listTab === "pairs" ? "Search pairings" : "Search faces";
    }
    tabsEl.onclick = function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var next = btn.getAttribute("data-tab");
      if (next === listTab) return;
      listTab = next;
      activeIndex = 0;
      chrome.storage.local.set({ tab: listTab });
      renderTabs();
      renderLists();
      previewActive();
      updateMeta();
      renderWeightUi();
    };
  }

  function visibleItems() {
    var q = (query || "").trim().toLowerCase();
    if (listTab === "pairs") {
      var profile = ensureHierarchy().profile;
      var pairs = TX_PAIRINGS.filter(function (p) {
        var blob = (p.heading + " " + p.body + " " + p.note).toLowerCase();
        return !q || blob.indexOf(q) !== -1;
      })
        .map(function (p) {
          return {
            id: p.id,
            heading: p.heading,
            body: p.body,
            note: p.note,
            score: scorePair(p, profile)
          };
        })
        .sort(function (a, b) {
          return b.score - a.score;
        });
      if (pairs.length) {
        var top = pairs[0].score;
        pairs.forEach(function (p) {
          p.fit = p.score >= top && top >= 4;
        });
      }
      if (session.heading && session.body) {
        var current = {
          id: "current",
          heading: session.heading,
          body: session.body,
          note: "Current pair",
          fit: false,
          score: 0
        };
        var already = pairs.some(function (p) {
          return p.heading === current.heading && p.body === current.body;
        });
        if (!already) pairs = [current].concat(pairs);
      }
      return {
        fonts: [],
        pairs: pairs,
        items: pairs.map(function (p) {
          return { kind: "pair", pair: p };
        })
      };
    }
    var fonts = TX_FONTS.filter(function (f) {
      return !q || f.family.toLowerCase().indexOf(q) !== -1 || f.category.indexOf(q) !== -1;
    });
    return {
      fonts: fonts,
      pairs: [],
      items: fonts.map(function (f) {
        return { kind: "font", font: f };
      })
    };
  }

  function renderLists() {
    var vis = visibleItems();
    if (!fontsEl || !pairsEl) return;
    if (listTab === "fonts") {
      if (!vis.fonts.length) {
        fontsEl.innerHTML = '<div class="tx-empty">No faces</div>';
      } else {
        fontsEl.innerHTML = vis.fonts
          .map(function (f, i) {
            return (
              '<button type="button" class="tx-row' +
              (activeIndex === i ? " is-active" : "") +
              '" data-kind="font" data-family="' +
              escapeAttr(f.family) +
              '"><span class="tx-font-name" style="font-family:' +
              escapeAttr(txStack(f.family)) +
              ";font-weight:" +
              knobs.weight +
              '">' +
              escapeHtml(f.family) +
              '</span><span class="tx-font-cat">' +
              f.category +
              "</span></button>"
            );
          })
          .join("");
      }
      pairsEl.innerHTML = "";
      updateMeta();
      return;
    }
    fontsEl.innerHTML = "";
    if (!vis.pairs.length) {
      pairsEl.innerHTML = '<div class="tx-empty">No pairings</div>';
      updateMeta();
      return;
    }
    pairsEl.innerHTML = vis.pairs
      .map(function (p, i) {
        return (
          '<button type="button" class="tx-row tx-pair-row' +
          (activeIndex === i ? " is-active" : "") +
          (p.fit ? " is-fit" : "") +
          '" data-kind="pair" data-id="' +
          escapeAttr(p.id) +
          '"><span class="tx-pair-h" style="font-family:' +
          escapeAttr(txStack(p.heading)) +
          ";font-weight:" +
          knobs.headingWeight +
          '">' +
          escapeHtml(p.heading) +
          '</span><span class="tx-pair-b" style="font-family:' +
          escapeAttr(txStack(p.body)) +
          ";font-weight:" +
          knobs.bodyWeight +
          '">' +
          escapeHtml(p.body) +
          '</span><span class="tx-pair-note' +
          (p.fit ? " is-fit" : "") +
          '">' +
          (p.fit ? "Fits this page · " : "") +
          escapeHtml(p.note) +
          "</span></button>"
        );
      })
      .join("");
    updateMeta();
  }

  function markActive() {
    var rows = panel.querySelectorAll(".tx-row");
    rows.forEach(function (row, i) {
      row.classList.toggle("is-active", i === activeIndex);
    });
    if (rows[activeIndex]) {
      rows[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function onRowMove(e) {
    var row = e.target.closest(".tx-row");
    if (!row) return;
    var rows = panel.querySelectorAll(".tx-row");
    var idx = Array.prototype.indexOf.call(rows, row);
    if (idx === activeIndex) return;
    activeIndex = idx;
    markActive();
    previewActive();
  }

  function onRowClick(e) {
    var row = e.target.closest(".tx-row");
    if (!row) return;
    commitActive();
  }

  function previewActive() {
    var vis = visibleItems();
    var item = vis.items[activeIndex];
    if (!item) {
      preview = null;
      paint();
      return;
    }
    if (item.kind === "font") {
      preview = { type: "font", family: item.font.family };
      if (scope === "headings" || scope === "body") ensureHierarchy();
      loadFonts([item.font.family]);
    } else {
      ensureHierarchy();
      preview = {
        type: "pair",
        heading: item.pair.heading,
        body: item.pair.body
      };
      loadFonts([item.pair.heading, item.pair.body]);
    }
    paint();
  }

  function commitActive() {
    var vis = visibleItems();
    var item = vis.items[activeIndex];
    if (!item) return;
    if (item.kind === "font") applyFont(item.font.family);
    else applyPair(item.pair.heading, item.pair.body);
    preview = null;
    paint();
    renderLists();
  }

  function applyFont(family) {
    loadFonts([family]);
    var sc = effectiveScope(false);
    if (sc === "this" && bound) {
      var id = stamp(bound);
      session.elements[id] = family;
    } else if (sc === "tag" && bound) {
      session.tags[bound.tagName.toLowerCase()] = family;
    } else if (sc === "headings") {
      ensureHierarchy();
      session.heading = family;
    } else if (sc === "body") {
      ensureHierarchy();
      session.body = family;
    } else {
      session.all = family;
    }
  }

  function applyPair(heading, body) {
    ensureHierarchy();
    loadFonts([heading, body]);
    session.heading = heading;
    session.body = body;
    session.all = null;
  }

  function effectiveScope(isPair) {
    if (isPair) return "headings";
    return scope;
  }

  function stamp(el) {
    var id = el.getAttribute("data-tx-id");
    if (!id) {
      id = "tx-id-" + nextTxId++;
      el.setAttribute("data-tx-id", id);
    }
    return id;
  }

  function guessCat(fontFamily) {
    var lower = String(fontFamily || "").toLowerCase();
    if (typeof TX_FONTS !== "undefined") {
      for (var i = 0; i < TX_FONTS.length; i++) {
        if (lower.indexOf(TX_FONTS[i].family.toLowerCase()) !== -1) return TX_FONTS[i].category;
      }
    }
    if (/\bmono(space)?\b/.test(lower)) return "mono";
    if (/\bserif\b/.test(lower) && !/\bsans-serif\b/.test(lower)) return "serif";
    return "sans";
  }

  function parseWeight(value) {
    var n = parseInt(value, 10);
    if (n) return n;
    if (value === "bold") return 700;
    return 400;
  }

  function ownTextLen(el) {
    var n = 0;
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === 3 && node.textContent) n += node.textContent.trim().length;
    }
    return n;
  }

  function charModeSize(samples) {
    var buckets = {};
    samples.forEach(function (s) {
      var k = Math.round(s.size);
      buckets[k] = (buckets[k] || 0) + s.len;
    });
    var best = 16;
    var n = -1;
    Object.keys(buckets).forEach(function (k) {
      if (buckets[k] > n) {
        n = buckets[k];
        best = Number(k);
      }
    });
    return best;
  }

  function meanSize(samples) {
    if (!samples.length) return 16;
    var w = 0;
    var t = 0;
    samples.forEach(function (s) {
      w += s.size * s.len;
      t += s.len;
    });
    return t ? w / t : samples[0].size;
  }

  function modeCat(samples) {
    var counts = { sans: 0, serif: 0, mono: 0 };
    samples.forEach(function (s) {
      counts[s.cat] = (counts[s.cat] || 0) + s.len;
    });
    var best = "sans";
    var n = -1;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > n) {
        n = counts[k];
        best = k;
      }
    });
    return best;
  }

  function collectTypeSamples() {
    var samples = [];
    if (!document.body) return samples;
    var all = document.body.getElementsByTagName("*");
    var limit = Math.min(all.length, 2800);
    for (var i = 0; i < limit; i++) {
      var el = all[i];
      if (ignored(el)) continue;
      if (!hasOwnText(el)) continue;
      var cs = window.getComputedStyle(el);
      if (!cs || cs.display === "none" || cs.visibility === "hidden") continue;
      var size = parseFloat(cs.fontSize);
      if (!size || size < 8) continue;
      var len = ownTextLen(el);
      if (len < 1) continue;
      samples.push({
        el: el,
        size: size,
        weight: parseWeight(cs.fontWeight),
        cat: guessCat(cs.fontFamily),
        tag: el.tagName.toLowerCase(),
        len: len
      });
    }
    return samples;
  }

  function classifyHierarchy(samples) {
    var heading = [];
    var body = [];
    if (!samples.length) {
      return { heading: heading, body: body, bodySize: 16, headingSize: 16 };
    }
    var bodySize = charModeSize(samples);
    samples.forEach(function (s) {
      var semantic = s.tag === "h1" || s.tag === "h2" || s.tag === "h3";
      if (s.size <= bodySize * 0.82 && s.size < 13) return;
      if (
        semantic ||
        s.size >= bodySize * 1.22 ||
        (s.weight >= 600 && s.size >= bodySize * 1.1 && s.len < 96)
      ) {
        heading.push(s);
      } else {
        body.push(s);
      }
    });
    if (!heading.length) {
      var max = 0;
      samples.forEach(function (s) {
        if (s.size > max) max = s.size;
      });
      if (max >= bodySize + 2) {
        samples.forEach(function (s) {
          if (s.size >= max - 0.5) heading.push(s);
        });
        body = samples.filter(function (s) {
          return s.size < max - 0.5 && !(s.size <= bodySize * 0.82 && s.size < 13);
        });
      }
    }
    if (!heading.length) {
      var sorted = samples.slice().sort(function (a, b) {
        return b.size - a.size;
      });
      var cut = Math.max(1, Math.ceil(sorted.length * 0.12));
      heading = sorted.slice(0, cut);
      body = samples.filter(function (s) {
        return heading.indexOf(s) === -1 && !(s.size <= bodySize * 0.82 && s.size < 13);
      });
    }
    if (!body.length) {
      body = samples.filter(function (s) {
        return heading.indexOf(s) === -1;
      });
    }
    return {
      heading: heading,
      body: body,
      bodySize: bodySize,
      headingSize: meanSize(heading.length ? heading : samples)
    };
  }

  function buildProfile(classified) {
    var h = classified.heading;
    var b = classified.body;
    var hSize = Math.round(classified.headingSize);
    var bSize = Math.round(classified.bodySize);
    var hCat = modeCat(h.length ? h : b);
    var bCat = modeCat(b.length ? b : h);
    var ratio = bSize ? hSize / bSize : 1;
    var cue;
    if (!h.length && !b.length) cue = "No text found on this page";
    else if (ratio < 1.18) cue = "Flat " + bSize + "px · pairing splits display / body";
    else cue = "Display " + hSize + "px / Body " + bSize + "px · " + hCat + " + " + bCat;
    return {
      hCat: hCat,
      bCat: bCat,
      hSize: hSize,
      bSize: bSize,
      hWeight: meanWeight(h.length ? h : b),
      bWeight: meanWeight(b.length ? b : h),
      ratio: ratio,
      contrast: hCat !== bCat,
      cue: cue
    };
  }

  function stampRoles(classified) {
    document.querySelectorAll("[data-tx-role]").forEach(function (el) {
      el.removeAttribute("data-tx-role");
    });
    classified.heading.forEach(function (s) {
      s.el.setAttribute("data-tx-role", "heading");
    });
    classified.body.forEach(function (s) {
      s.el.setAttribute("data-tx-role", "body");
    });
  }

  function ensureHierarchy() {
    if (hierarchyCache) return hierarchyCache;
    var classified = classifyHierarchy(collectTypeSamples());
    stampRoles(classified);
    hierarchyCache = {
      heading: classified.heading,
      body: classified.body,
      profile: buildProfile(classified)
    };
    var profile = hierarchyCache.profile;
    if (!knobsUsed.headingWeight) knobs.headingWeight = profile.hWeight;
    if (!knobsUsed.bodyWeight) knobs.bodyWeight = profile.bWeight;
    if (!knobsUsed.weight) knobs.weight = profile.bWeight;
    if (panel) syncWeightChips();
    return hierarchyCache;
  }

  function clearHierarchy() {
    hierarchyCache = null;
    document.querySelectorAll("[data-tx-role]").forEach(function (el) {
      el.removeAttribute("data-tx-role");
    });
  }

  function scorePair(pair, profile) {
    var hCat = txCategory(pair.heading);
    var bCat = txCategory(pair.body);
    var score = 0;
    if (!profile) return 0;
    if (profile.ratio < 1.18) {
      if (hCat !== bCat) score += 4;
      if (hCat === "serif" && bCat === "sans") score += 3;
    } else {
      if (hCat === profile.hCat) score += 3;
      if (bCat === profile.bCat) score += 3;
      if ((hCat !== bCat) === profile.contrast) score += 2;
    }
    if (hCat === "serif" && bCat === "sans") score += 1;
    return score;
  }

  function pairRoles() {
    if (scope === "headings") return { heading: true, body: false };
    if (scope === "body") return { heading: false, body: true };
    return { heading: true, body: true };
  }

  function headingSelector() {
    return '[data-tx-role="heading"], ' + TX_HEADING_SELECTOR;
  }

  function bodySelector() {
    return '[data-tx-role="body"], ' + TX_BODY_SELECTOR;
  }

  function allTextSelector() {
    return (
      "body, body *:not(script):not(style):not(svg):not(canvas):not(code):not(pre):not(kbd):not(samp):not(noscript):not(#tx-root):not(#tx-explorer-panel):not(#tx-explorer-ring)"
    );
  }

  function typeSelector() {
    if (scope === "this" && bound) {
      if (!anyTypeKnobs()) return null;
      return '[data-tx-id="' + stamp(bound) + '"]';
    }
    if (scope === "tag" && bound) return bound.tagName.toLowerCase();
    if (scope === "headings") return headingSelector();
    if (scope === "body") return bodySelector();
    return allTextSelector();
  }

  function typeDecls(bang) {
    var parts = [];
    if (knobsUsed.size) parts.push("font-size: " + knobs.size + "px" + bang);
    if (knobsUsed.leading) parts.push("line-height: " + knobs.leading + bang);
    if (knobsUsed.tracking) parts.push("letter-spacing: " + knobs.tracking + "em" + bang);
    return parts.join(" ");
  }

  function prettyDecls() {
    var parts = [];
    if (knobsUsed.size) parts.push("  font-size: " + knobs.size + "px;");
    if (knobsUsed.leading) parts.push("  line-height: " + knobs.leading + ";");
    if (knobsUsed.tracking) parts.push("  letter-spacing: " + knobs.tracking + "em;");
    return parts;
  }

  function exportTypeSelector() {
    if (scope === "this" && bound && bound.getAttribute("data-tx-id")) {
      return '[data-tx-id="' + bound.getAttribute("data-tx-id") + '"]';
    }
    if (scope === "tag" && bound) return bound.tagName.toLowerCase();
    if (scope === "headings") return headingSelector();
    if (scope === "body") return bodySelector();
    if (scope === "this") return null;
    return "body";
  }

  function mergedView() {
    document.querySelectorAll("[data-tx-preview]").forEach(function (el) {
      el.removeAttribute("data-tx-preview");
    });

    var heading = session.heading;
    var body = session.body;
    var all = session.all;
    var tags = Object.assign({}, session.tags);
    var elements = Object.assign({}, session.elements);
    var previewFamily = null;
    var sc = scope;
    var roles = pairRoles();

    if (preview && preview.type === "pair") {
      heading = roles.heading ? preview.heading : session.heading;
      body = roles.body ? preview.body : session.body;
      all = null;
    } else if (preview && preview.type === "font") {
      if (sc === "this" && bound) {
        bound.setAttribute("data-tx-preview", "1");
        previewFamily = preview.family;
      } else if (sc === "tag" && bound) {
        tags[bound.tagName.toLowerCase()] = preview.family;
      } else if (sc === "headings") {
        heading = preview.family;
      } else if (sc === "body") {
        body = preview.family;
      } else {
        all = preview.family;
      }
    }
    return {
      heading: heading,
      body: body,
      all: all,
      tags: tags,
      elements: elements,
      previewFamily: previewFamily
    };
  }

  function familiesInUse(view) {
    var list = ["Geist", "Newsreader"];
    if (view.all) list.push(view.all);
    if (view.heading) list.push(view.heading);
    if (view.body) list.push(view.body);
    Object.keys(view.tags).forEach(function (k) {
      list.push(view.tags[k]);
    });
    Object.keys(view.elements).forEach(function (k) {
      list.push(view.elements[k]);
    });
    return list;
  }

  function loadFonts(extra) {
    var view = mergedView();
    var families = familiesInUse(view).concat(extra || []);
    families.forEach(function (family) {
      if (!family || loadedFonts[family]) return;
      var href = txGoogleFontsUrl([family]);
      if (!href) return;
      loadedFonts[family] = true;
      var el = document.createElement("link");
      el.rel = "stylesheet";
      el.setAttribute("data-tx-font-link", family);
      el.setAttribute("href", href);
      document.documentElement.appendChild(el);
    });
  }

  function rule(selector, body) {
    var ignore = TX_IGNORE_SELECTOR.split(/\s*,\s*/)
      .map(function (s) {
        return ":not(" + s + ")";
      })
      .join("");
    return ":is(" + selector + ")" + ignore + " { " + body + " }";
  }

  function faceDecls(family, weight, bang) {
    var s = "font-family: " + txStack(family) + bang + ";";
    if (weight != null) s += " font-weight: " + weight + bang + ";";
    return s;
  }

  function headingFaceWeight() {
    if (knobsUsed.headingWeight) return knobs.headingWeight;
    if (listTab !== "pairs" && knobsUsed.weight) return knobs.weight;
    return null;
  }

  function bodyFaceWeight() {
    if (knobsUsed.bodyWeight) return knobs.bodyWeight;
    if (listTab !== "pairs" && knobsUsed.weight) return knobs.weight;
    return null;
  }

  function singleFaceWeight() {
    if (knobsUsed.weight) return knobs.weight;
    return null;
  }

  function cssFromView(view, important) {
    var bang = important ? " !important" : "";
    var lines = [];
    if (view.all) {
      lines.push(rule(allTextSelector(), faceDecls(view.all, singleFaceWeight(), bang)));
    }
    if (view.heading && pairRoles().heading) {
      lines.push(rule(headingSelector(), faceDecls(view.heading, headingFaceWeight(), bang)));
    }
    if (view.body && pairRoles().body) {
      lines.push(rule(bodySelector(), faceDecls(view.body, bodyFaceWeight(), bang)));
    }
    Object.keys(view.tags).forEach(function (tag) {
      lines.push(rule(tag, faceDecls(view.tags[tag], singleFaceWeight(), bang)));
    });
    Object.keys(view.elements).forEach(function (id) {
      lines.push(
        '[data-tx-id="' + id + '"] { ' + faceDecls(view.elements[id], singleFaceWeight(), bang) + " }"
      );
    });
    if (view.previewFamily) {
      lines.push("[data-tx-preview] { " + faceDecls(view.previewFamily, singleFaceWeight(), bang) + " }");
    }
    if (anyTypeKnobs()) {
      var decls = typeDecls(bang);
      var sel = typeSelector();
      if (decls && sel) {
        if (sel.charAt(0) === "[") lines.push(sel + " { " + decls + " }");
        else lines.push(rule(sel, decls));
      }
    }
    return lines.join("\n");
  }

  function paint() {
    var view = mergedView();
    loadFonts();
    var css = cssFromView(view, true);
    var el = document.getElementById(STYLE_ID);
    if (!css) {
      if (el) el.textContent = "";
      updateMeta();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.documentElement.appendChild(el);
    }
    el.textContent = css;
    updateMeta();
  }

  function exportCss() {
    var families = [];
    if (session.all) families.push(session.all);
    if (session.heading) families.push(session.heading);
    if (session.body) families.push(session.body);
    Object.keys(session.tags).forEach(function (k) {
      families.push(session.tags[k]);
    });
    Object.keys(session.elements).forEach(function (k) {
      families.push(session.elements[k]);
    });
    var href = txGoogleFontsUrl(families);
    var chunks = [];
    if (href) chunks.push("@import url('" + href + "');");
    var lines = [];
    if (session.all) {
      lines.push(
        "body {\n" +
          exportFaceLines(session.all, singleFaceWeight()) +
          "\n}"
      );
    }
    if (session.heading) {
      var hNote =
        hierarchyCache && hierarchyCache.profile
          ? "/* " + hierarchyCache.profile.cue + " */\n"
          : "";
      lines.push(
        hNote +
          TX_HEADING_SELECTOR +
          ",\n[data-tx-role=\"heading\"] {\n" +
          exportFaceLines(session.heading, headingFaceWeight()) +
          "\n}"
      );
    }
    if (session.body) {
      lines.push(
        TX_BODY_SELECTOR +
          ",\n[data-tx-role=\"body\"] {\n" +
          exportFaceLines(session.body, bodyFaceWeight()) +
          "\n}"
      );
    }
    Object.keys(session.tags).forEach(function (tag) {
      lines.push(
        tag + " {\n" + exportFaceLines(session.tags[tag], singleFaceWeight()) + "\n}"
      );
    });
    Object.keys(session.elements).forEach(function (id) {
      lines.push(
        '[data-tx-id="' +
          id +
          '"] {\n' +
          exportFaceLines(session.elements[id], singleFaceWeight()) +
          "\n}"
      );
    });
    if (anyTypeKnobs()) {
      var typeSel = exportTypeSelector();
      var typeLines = prettyDecls();
      if (typeSel && typeLines.length) {
        lines.push(typeSel + " {\n" + typeLines.join("\n") + "\n}");
      }
    }
    if (lines.length) chunks.push(lines.join("\n\n"));
    return chunks.join("\n\n");
  }

  function exportFaceLines(family, weight) {
    var lines = ["  font-family: " + txStack(family) + ";"];
    if (weight != null) lines.push("  font-weight: " + weight + ";");
    return lines.join("\n");
  }

  function copyCss() {
    var css = exportCss();
    if (!css) {
      showToast("Nothing to copy");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(css).then(
        function () {
          showToast("Copied to clipboard");
        },
        function () {
          fallbackCopy(css);
        }
      );
    } else fallbackCopy(css);
  }

  function fallbackCopy(css) {
    var ta = document.createElement("textarea");
    ta.value = css;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("Copied to clipboard");
    } catch (e) {
      showToast("Copy failed");
    }
    ta.remove();
  }

  function showToast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add("is-on");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 1400);
  }

  function resetAll() {
    session = emptySession();
    preview = null;
    knobs = defaultKnobs();
    knobsUsed = defaultKnobsUsed();
    clearHierarchy();
    document.querySelectorAll("[data-tx-id]").forEach(function (el) {
      el.removeAttribute("data-tx-id");
    });
    var style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    document.querySelectorAll("[data-tx-font-link]").forEach(function (fontLink) {
      fontLink.remove();
    });
    loadedFonts = {};
    syncKnobs();
    updateMeta();
    renderLists();
    closeDropdown(false);
  }

  function setPicker(on) {
    pickerOn = on;
    document.documentElement.classList.toggle("tx-explorer-on", on);
    if (on) {
      ensureRoot();
      ensureRing();
      loadFonts();
    } else {
      hideRing();
    }
  }

  function ignored(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.id === ROOT_ID || el.id === "tx-explorer-ring" || el.id === "tx-explorer-panel") return true;
    if (el.closest && el.closest("#tx-explorer-panel")) return true;
    if (el.closest && el.closest("svg, canvas, code, pre, kbd, samp, noscript")) return true;
    var tag = el.tagName;
    return (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "HEAD" ||
      tag === "HTML" ||
      tag === "BR" ||
      tag === "HR" ||
      tag === "IMG" ||
      tag === "VIDEO" ||
      tag === "AUDIO" ||
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      tag === "OPTION"
    );
  }

  function hasOwnText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent && n.textContent.trim()) return true;
    }
    return false;
  }

  function fromPoint(x, y) {
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (el.id === ROOT_ID || el.id === "tx-explorer-ring" || el.id === "tx-explorer-panel") continue;
      if (panel && (el === panel || (panel.contains && panel.contains(el)))) continue;
      if (shadow && shadow.contains(el)) continue;
      return el;
    }
    return null;
  }

  function pickTarget(raw) {
    var el = raw;
    if (!el) return null;
    if (el.nodeType === 3) el = el.parentElement;
    while (el && ignored(el)) el = el.parentElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    var cur = el;
    var found = null;
    while (cur && cur !== document.body) {
      if (!ignored(cur) && hasOwnText(cur)) {
        found = cur;
        break;
      }
      cur = cur.parentElement;
    }
    return found || el;
  }

  function placeRing(el) {
    if (!ring || !el) {
      hideRing();
      return;
    }
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) {
      hideRing();
      return;
    }
    ring.style.left = r.left + "px";
    ring.style.top = r.top + "px";
    ring.style.width = r.width + "px";
    ring.style.height = r.height + "px";
    ring.classList.add("is-on");
  }

  function hideRing() {
    if (ring) ring.classList.remove("is-on");
    hoverEl = null;
  }

  function applyWidget() {
    if (!panel) return;
    panel.style.left = widget.left + "px";
    panel.style.top = widget.top + "px";
    panel.style.width = widget.width + "px";
    panel.style.height = widget.height + "px";
  }

  function clampWidget() {
    var minW = 640;
    var minH = 420;
    widget.width = Math.min(Math.max(minW, widget.width), Math.max(minW, window.innerWidth - 16));
    widget.height = Math.min(Math.max(minH, widget.height), Math.max(minH, window.innerHeight - 16));
    widget.left = Math.min(Math.max(8, widget.left), window.innerWidth - 64);
    widget.top = Math.min(Math.max(8, widget.top), window.innerHeight - 48);
  }

  function saveWidget() {
    chrome.storage.local.set({
      widget: {
        left: widget.left,
        top: widget.top,
        width: widget.width,
        height: widget.height
      }
    });
  }

  function bindWidget() {
    var head = panel.querySelector(".tx-head");
    if (!head) return;

    function startDrag(kind, dir, e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      var rect = panel.getBoundingClientRect();
      var startX = e.clientX;
      var startY = e.clientY;
      var orig = { l: rect.left, t: rect.top, w: rect.width, h: rect.height };
      var moved = false;
      var handle = e.currentTarget;
      var cursors = {
        n: "ns-resize",
        s: "ns-resize",
        e: "ew-resize",
        w: "ew-resize",
        nw: "nwse-resize",
        se: "nwse-resize",
        ne: "nesw-resize",
        sw: "nesw-resize"
      };
      var cls = kind === "resize" ? "tx-widget-resize" : "tx-widget-drag";
      document.documentElement.classList.add(cls);
      if (kind === "resize") document.documentElement.style.cursor = cursors[dir] || "nwse-resize";
      else document.documentElement.style.cursor = "grabbing";
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {}

      function move(ev) {
        ev.preventDefault();
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        if (kind === "resize") {
          var left = orig.l;
          var top = orig.t;
          var w = orig.w;
          var h = orig.h;
          var minW = 640;
          var minH = 420;
          if (dir.indexOf("e") !== -1) w = orig.w + dx;
          if (dir.indexOf("s") !== -1) h = orig.h + dy;
          if (dir.indexOf("w") !== -1) {
            w = orig.w - dx;
            left = orig.l + dx;
          }
          if (dir.indexOf("n") !== -1) {
            h = orig.h - dy;
            top = orig.t + dy;
          }
          if (w < minW) {
            if (dir.indexOf("w") !== -1) left = orig.l + orig.w - minW;
            w = minW;
          }
          if (h < minH) {
            if (dir.indexOf("n") !== -1) top = orig.t + orig.h - minH;
            h = minH;
          }
          widget.left = left;
          widget.top = top;
          widget.width = w;
          widget.height = h;
        } else {
          widget.left = orig.l + dx;
          widget.top = orig.t + dy;
        }
        widget.parked = true;
        clampWidget();
        applyWidget();
      }

      function up() {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("mousemove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("mouseup", up, true);
        document.documentElement.classList.remove(cls);
        document.documentElement.style.cursor = "";
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch (err) {}
        if (moved) skipClick = true;
        saveWidget();
      }

      window.addEventListener("pointermove", move, true);
      window.addEventListener("mousemove", move, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("mouseup", up, true);
    }

    head.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".tx-close, .tx-search, .tx-search-wrap, button, input")) return;
      startDrag("move", "", e);
    });
    panel.querySelectorAll(".tx-rh").forEach(function (node) {
      node.addEventListener("pointerdown", function (e) {
        startDrag("resize", node.getAttribute("data-dir"), e);
      });
    });
  }

  function placePanel() {
    if (!panel) return;
    if (widget.parked && widget.left != null) {
      clampWidget();
      applyWidget();
      return;
    }
    var w = widget.width || 880;
    var h = widget.height || 560;
    var left = 24;
    var top = 24;
    if (bound) {
      var r = bound.getBoundingClientRect();
      left = r.left;
      top = r.bottom + 10;
      if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12;
      if (left < 12) left = 12;
      if (top + Math.min(h, 280) > window.innerHeight - 12) {
        top = r.top - 10 - Math.min(h, 360);
      }
      if (top < 12) top = 12;
    }
    widget.left = left;
    widget.top = top;
    clampWidget();
    applyWidget();
  }

  function openDropdown() {
    hierarchyCache = null;
    ensureRoot();
    dropdownOpen = true;
    query = "";
    activeIndex = 0;
    searchInput.value = "";
    renderScope();
    renderTabs();
    renderLists();
    placePanel();
    widget.parked = true;
    panel.classList.add("is-open");
    placeRing(bound);
    loadFonts();
    previewActive();
    setTimeout(function () {
      searchInput.focus();
    }, 0);
  }

  function closeDropdown(dropPreview) {
    dropdownOpen = false;
    if (panel) panel.classList.remove("is-open");
    if (dropPreview) {
      preview = null;
      paint();
      hideRing();
    }
  }

  function onMove(e) {
    if (!pickerOn || dropdownOpen) return;
    var raw = fromPoint(e.clientX, e.clientY);
    var el = pickTarget(raw);
    hoverEl = el;
    placeRing(el);
  }

  function onClick(e) {
    if (!pickerOn) return;
    if (skipClick) {
      skipClick = false;
      return;
    }
    if (panel && (e.target === panel || (panel.contains && panel.contains(e.target)))) return;
    if (e.target.closest && e.target.closest("#tx-explorer-panel")) return;
    e.preventDefault();
    e.stopPropagation();
    var el = pickTarget(fromPoint(e.clientX, e.clientY));
    if (!el) {
      closeDropdown(true);
      return;
    }
    bound = el;
    openDropdown();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      if (dropdownOpen) {
        e.preventDefault();
        closeDropdown(true);
      } else if (pickerOn) {
        setPicker(false);
      }
      return;
    }
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      var n = visibleItems().items.length;
      if (!n) return;
      activeIndex = (activeIndex + 1) % n;
      markActive();
      previewActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      var n2 = visibleItems().items.length;
      if (!n2) return;
      activeIndex = (activeIndex - 1 + n2) % n2;
      markActive();
      previewActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitActive();
    }
  }

  function onSearchKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
      onKey(e);
    }
  }

  function onScroll() {
    if (dropdownOpen && bound) placeRing(bound);
    else if (pickerOn && hoverEl) placeRing(hoverEl);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", function () {
    if (dropdownOpen) {
      clampWidget();
      applyWidget();
    }
    onScroll();
  });
})();

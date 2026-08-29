(function () {
  if (window.__txLiveDemo) return "already on";
  window.__txLiveDemo = true;

  var css =
    ".tx-live-ring{position:fixed;pointer-events:none;border:1px solid #18a0fb;box-sizing:border-box;z-index:2147483646;opacity:0}" +
    ".tx-live-ring.on{opacity:1}" +
    ".tx-live-h{position:absolute;width:7px;height:7px;background:#fff;border:1px solid #18a0fb;box-sizing:border-box}" +
    ".tx-live-h.nw{top:0;left:0;transform:translate(-50%,-50%)}" +
    ".tx-live-h.ne{top:0;right:0;transform:translate(50%,-50%)}" +
    ".tx-live-h.sw{bottom:0;left:0;transform:translate(-50%,50%)}" +
    ".tx-live-h.se{bottom:0;right:0;transform:translate(50%,50%)}" +
    ".tx-live-panel{position:fixed;z-index:2147483647;width:240px;background:#141210;color:#f3ecdf;border:1px solid rgba(243,236,223,.13);border-radius:10px;font:13px/1.35 ui-sans-serif,system-ui,sans-serif;display:none;overflow:hidden}" +
    ".tx-live-panel.on{display:block}" +
    ".tx-live-panel header{padding:12px 14px;font:500 16px Palatino,Georgia,serif}" +
    ".tx-live-panel button{display:block;width:100%;padding:8px 14px;border:0;background:transparent;color:#f3ecdf;text-align:left;cursor:pointer;font:16px/1.2 inherit}" +
    ".tx-live-panel button:hover{background:rgba(24,160,251,.12)}" +
    "html.tx-live-on,html.tx-live-on *{cursor:text !important}";

  var style = document.createElement("style");
  style.textContent = css;
  document.documentElement.appendChild(style);

  var ring = document.createElement("div");
  ring.className = "tx-live-ring";
  ring.innerHTML =
    '<i class="tx-live-h nw"></i><i class="tx-live-h ne"></i><i class="tx-live-h sw"></i><i class="tx-live-h se"></i>';
  document.documentElement.appendChild(ring);

  var panel = document.createElement("div");
  panel.className = "tx-live-panel";
  panel.innerHTML =
    "<header>Typeface</header>" +
    '<button data-f="Inter" style="font-family:Inter,sans-serif">Inter</button>' +
    '<button data-f="Georgia" style="font-family:Georgia,serif">Georgia</button>' +
    '<button data-f="Times New Roman" style="font-family:Times New Roman,serif">Times New Roman</button>' +
    '<button data-f="system-ui" style="font-family:system-ui,sans-serif">System UI</button>';
  document.documentElement.appendChild(panel);

  document.documentElement.classList.add("tx-live-on");

  var hover = null;
  var bound = null;
  var open = false;

  function skip(el) {
    return !el || el === ring || el === panel || (el.closest && (el.closest(".tx-live-panel") || el.closest(".tx-live-ring")));
  }

  function pick(raw) {
    var el = raw;
    while (el && (el.nodeType !== 1 || skip(el))) el = el.parentElement;
    while (el && el !== document.body) {
      var tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "IMG" || tag === "SVG" || tag === "INPUT" || tag === "TEXTAREA") {
        el = el.parentElement;
        continue;
      }
      var text = (el.innerText || "").trim();
      if (text) return el;
      el = el.parentElement;
    }
    return null;
  }

  function place(el) {
    if (!el) {
      ring.classList.remove("on");
      return;
    }
    var r = el.getBoundingClientRect();
    ring.style.left = r.left + "px";
    ring.style.top = r.top + "px";
    ring.style.width = r.width + "px";
    ring.style.height = r.height + "px";
    ring.classList.add("on");
  }

  document.addEventListener(
    "mousemove",
    function (e) {
      if (open) return;
      hover = pick(document.elementFromPoint(e.clientX, e.clientY));
      place(hover);
    },
    true
  );

  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest && e.target.closest(".tx-live-panel")) return;
      e.preventDefault();
      e.stopPropagation();
      bound = pick(e.target);
      if (!bound) {
        panel.classList.remove("on");
        open = false;
        return;
      }
      open = true;
      place(bound);
      var r = bound.getBoundingClientRect();
      panel.style.left = Math.min(r.left, innerWidth - 260) + "px";
      panel.style.top = Math.min(r.bottom + 8, innerHeight - 220) + "px";
      panel.classList.add("on");
    },
    true
  );

  panel.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || !bound) return;
    bound.style.fontFamily = btn.getAttribute("data-f");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      open = false;
      panel.classList.remove("on");
    }
  });

  return "picker on — hover text, click to try a face";
})();

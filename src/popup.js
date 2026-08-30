function send(payload) {
  return chrome.runtime.sendMessage({ relay: "tx", payload: payload });
}

var enableBtn = document.getElementById("enable");
var copyBtn = document.getElementById("copy");
var resetBtn = document.getElementById("reset");
var stateEl = document.getElementById("state");
var dot = document.getElementById("dot");
var msg = document.getElementById("msg");

function flash(text) {
  msg.textContent = text || "";
}

function render(state) {
  var on = !!(state && state.pickerOn);
  dot.classList.toggle("on", on);
  stateEl.textContent = on ? "Picker on" : "Picker off";
  enableBtn.textContent = on ? "Disable picker" : "Enable picker";
  enableBtn.classList.toggle("on", on);
}

function refresh() {
  send({ type: "TX_STATE" }).then(function (res) {
    if (!res || !res.ok) {
      flash((res && res.error) || "Open a normal web page first.");
      render({ pickerOn: false });
      return;
    }
    flash("");
    render(res);
  });
}

enableBtn.addEventListener("click", function () {
  send({ type: "TX_STATE" }).then(function (res) {
    var on = res && res.pickerOn;
    return send({ type: on ? "TX_DISABLE" : "TX_ENABLE" });
  }).then(function (res) {
    if (!res || !res.ok) {
      flash((res && res.error) || "Could not reach this tab.");
      return;
    }
    render(res);
    flash(res.pickerOn ? "Click any text on the page." : "");
  });
});

copyBtn.addEventListener("click", function () {
  send({ type: "TX_EXPORT" }).then(function (res) {
    if (!res || !res.ok) {
      flash((res && res.error) || "Nothing to copy.");
      return;
    }
    if (!res.css) {
      flash("Nothing to copy yet.");
      return;
    }
    navigator.clipboard.writeText(res.css).then(
      function () {
        flash("Snippet copied.");
      },
      function () {
        flash("Clipboard blocked.");
      }
    );
  });
});

resetBtn.addEventListener("click", function () {
  send({ type: "TX_RESET" }).then(function (res) {
    if (!res || !res.ok) {
      flash((res && res.error) || "Could not reset.");
      return;
    }
    flash("Page type restored.");
  });
});

refresh();

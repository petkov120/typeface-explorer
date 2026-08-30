async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function sendToTab(message) {
  const tab = await activeTab();
  if (!tab?.id || !/^https?:/.test(tab.url || "")) {
    return { ok: false, error: "Open an http(s) page, including localhost." };
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/fonts.js", "src/pairings.js", "src/content.js"]
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/content.css"]
    });
    return await chrome.tabs.sendMessage(tab.id, message);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.relay !== "tx") return;
  sendToTab(message.payload)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true;
});

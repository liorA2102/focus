const FOCUS_BASE = "http://localhost:3001";
const CACHE_TTL_MS = 5 * 60 * 1000; // refresh templates every 5 min

let templateCache = null;
let cacheTime = 0;

async function fetchTemplates(force = false) {
  const now = Date.now();
  if (!force && templateCache && now - cacheTime < CACHE_TTL_MS) {
    return templateCache;
  }
  try {
    const res = await fetch(`${FOCUS_BASE}/api/comment-templates`);
    if (!res.ok) throw new Error("non-ok response");
    templateCache = await res.json();
    cacheTime = now;
    return templateCache;
  } catch {
    return templateCache ?? [];
  }
}

async function saveLead(data) {
  try {
    await fetch(`${FOCUS_BASE}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // Focus app may not be running — fail silently
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_TEMPLATES") {
    fetchTemplates(msg.force ?? false).then(sendResponse);
    return true; // async
  }
  if (msg.type === "SAVE_LEAD") {
    saveLead(msg.payload).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "GET_IMAGE") {
    // Fetch image from Focus and return as base64 data URL
    fetch(`${FOCUS_BASE}${msg.path}`)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ dataUrl: reader.result });
        reader.readAsDataURL(blob);
      })
      .catch(() => sendResponse({ dataUrl: null }));
    return true;
  }
});

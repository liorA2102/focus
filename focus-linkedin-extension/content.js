/*
 * Focus LinkedIn Assistant — content script
 */

const FOCUS_LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M27 0C41.9117 0 54 12.0883 54 27C54 41.9117 41.9117 54 27 54C12.0883 54 0 41.9117 0 27C0 12.0883 12.0883 0 27 0ZM25 4C12.2975 4 2 14.2975 2 27C2 39.7025 12.2975 50 25 50C37.7025 50 48 39.7025 48 27C48 14.2975 37.7025 4 25 4Z" fill="#F05851"/>
<path d="M24 5C36.1503 5 46 14.8497 46 27C46 39.1503 36.1503 49 24 49C11.8497 49 2 39.1503 2 27C2 14.8497 11.8497 5 24 5ZM21.5 7C10.7304 7 2 15.9543 2 27C2 38.0457 10.7304 47 21.5 47C32.2696 47 41 38.0457 41 27C41 15.9543 32.2696 7 21.5 7Z" fill="#F05851"/>
<path d="M2.00488 26.584C2.22035 16.2827 10.4181 8 20.5 8C30.7173 8 39 16.5066 39 27C39 37.4934 30.7173 46 20.5 46C10.4423 46 2.25904 37.7571 2.00586 27.4902L2.00488 27.4131C2.22398 36.0587 9.30155 43 18 43C26.8366 43 34 35.8366 34 27C34 18.1634 26.8366 11 18 11C9.30253 11 2.2255 17.9397 2.00488 26.584ZM2.00488 26.584C2.00135 26.7222 2 26.8609 2 27C2 26.861 2.00199 26.7223 2.00488 26.584Z" fill="#F05851"/>
<path d="M2.00391 26.6504C2.18349 18.5276 8.60483 12 16.5 12C24.5081 12 31 18.7157 31 27C31 35.2843 24.5081 42 16.5 42C8.61686 42 2.20317 35.4923 2.00488 27.3867L2.00391 27.3359C2.17523 34.3604 7.70444 40 14.5 40C21.4036 40 27 34.1797 27 27C27 19.8203 21.4036 14 14.5 14C7.70884 14 2.18206 19.6323 2.00391 26.6504ZM2.00391 26.6504C2.00096 26.7665 2 26.8831 2 27C2 26.8831 2.00134 26.7666 2.00391 26.6504Z" fill="#F05851"/>
<path d="M13.5 16C19.8513 16 25 20.9249 25 27C25 33.0751 19.8513 38 13.5 38C7.14873 38 2 33.0751 2 27C2 20.9249 7.14873 16 13.5 16ZM11.5 18C6.25329 18 2 22.0294 2 27C2 31.9706 6.25329 36 11.5 36C16.7467 36 21 31.9706 21 27C21 22.0294 16.7467 18 11.5 18Z" fill="#F05851"/>
</svg>`;

let activeEditor = null;
let activePostEl = null;
let floatingBtn = null;
let dropdown = null;
let templates = [];

// ── Boot ───────────────────────────────────────────────────────────────────
console.log("[Focus] content script loaded");
loadTemplates();

// ── Listen for ANY element gaining focus ──────────────────────────────────
document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (!el || el.contentEditable !== "true") return;
  if (el === activeEditor) return;

  // Skip the main "Start a post" composer
  if (el.closest('[data-testid="share-box"], .share-creation-state, .artdeco-modal')) return;

  console.log("[Focus] contenteditable focused:", el.className, el);
  activeEditor = el;
  activePostEl = findPostArticle(el);
  attachButton(el);
});

// Remove button when user clicks somewhere outside the comment area
document.addEventListener("click", (e) => {
  if (!floatingBtn) return;
  if (floatingBtn.contains(e.target)) return;
  if (dropdown?.contains(e.target)) return;
  if (activeEditor?.contains(e.target)) return;
  // Clicked outside — dismiss
  removeUI();
}, true);

// Remove button if the editor is removed from the DOM (e.g. user cancels comment)
const editorRemovalObserver = new MutationObserver(() => {
  if (activeEditor && !document.body.contains(activeEditor)) {
    removeUI();
  }
});
editorRemovalObserver.observe(document.body, { childList: true, subtree: true });

// ── Templates ──────────────────────────────────────────────────────────────
function loadTemplates(force = false) {
  chrome.runtime.sendMessage({ type: "GET_TEMPLATES", force }, (res) => {
    if (chrome.runtime.lastError) {
      console.warn("[Focus] template fetch error:", chrome.runtime.lastError.message);
      return;
    }
    templates = res ?? [];
    console.log("[Focus] templates loaded:", templates.length);
  });
}

// ── Button ─────────────────────────────────────────────────────────────────
function attachButton(editor) {
  removeUI();

  const rect = editor.getBoundingClientRect();
  if (!rect.width) return; // editor not visible yet

  floatingBtn = document.createElement("button");
  floatingBtn.className = "focus-btn";
  floatingBtn.title = "Focus – Insert template";
  floatingBtn.innerHTML = FOCUS_LOGO_SVG;

  // Use fixed positioning so we don't fight LinkedIn's layout
  floatingBtn.style.position = "fixed";
  floatingBtn.style.bottom = (window.innerHeight - rect.bottom + 6) + "px";
  floatingBtn.style.right = (window.innerWidth - rect.right + 6) + "px";
  floatingBtn.style.zIndex = "99999";

  document.body.appendChild(floatingBtn);

  floatingBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    toggleDropdown();
  });

  // Reposition on scroll
  floatingBtn._editor = editor;
  window.addEventListener("scroll", repositionBtn, { passive: true, once: true });

  console.log("[Focus] button attached, rect:", rect);
}

function repositionBtn() {
  if (!floatingBtn || !floatingBtn._editor) return;
  const rect = floatingBtn._editor.getBoundingClientRect();
  floatingBtn.style.bottom = (window.innerHeight - rect.bottom + 6) + "px";
  floatingBtn.style.right = (window.innerWidth - rect.right + 6) + "px";
}

// ── Dropdown ───────────────────────────────────────────────────────────────
function toggleDropdown() {
  if (dropdown) { dropdown.remove(); dropdown = null; return; }
  openDropdown();
}

function openDropdown() {
  dropdown = document.createElement("div");
  dropdown.className = "focus-dropdown";

  // Position above the button
  const btnRect = floatingBtn.getBoundingClientRect();
  dropdown.style.position = "fixed";
  dropdown.style.bottom = (window.innerHeight - btnRect.top + 6) + "px";
  dropdown.style.right = (window.innerWidth - btnRect.right) + "px";
  dropdown.style.zIndex = "100000";

  const header = document.createElement("div");
  header.className = "focus-dropdown-header";
  header.textContent = "Focus Templates";
  dropdown.appendChild(header);

  if (!templates || templates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-empty";
    empty.textContent = "No templates yet — add them in the Focus app (/leads)";
    dropdown.appendChild(empty);
  } else {
    templates.forEach((tmpl) => {
      const item = document.createElement("button");
      item.className = "focus-template-item";

      const thumb = document.createElement("div");
      if (tmpl.imageFilename) {
        const imgEl = document.createElement("img");
        imgEl.className = "focus-template-thumb";
        imgEl.src = `http://localhost:3001/linkedin-images/${tmpl.imageFilename}`;
        imgEl.alt = "";
        thumb.appendChild(imgEl);
      } else {
        thumb.className = "focus-template-placeholder";
        thumb.textContent = "💬";
      }

      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;text-align:left;";

      const titleEl = document.createElement("div");
      titleEl.className = "focus-template-title";
      titleEl.textContent = tmpl.title;

      const preview = document.createElement("div");
      preview.className = "focus-template-preview";
      preview.textContent = tmpl.body.substring(0, 60) + (tmpl.body.length > 60 ? "…" : "");

      info.appendChild(titleEl);
      info.appendChild(preview);
      item.appendChild(thumb);
      item.appendChild(info);
      item.addEventListener("mousedown", (e) => { e.preventDefault(); selectTemplate(tmpl); });
      dropdown.appendChild(item);
    });
  }

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "focus-template-item";
  refreshBtn.style.cssText = "border-top:1px solid #f0f0f0;margin-top:4px;color:#888;font-size:11px;justify-content:center;";
  refreshBtn.textContent = "↺ Refresh templates";
  refreshBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    loadTemplates(true);
    dropdown.remove(); dropdown = null;
    setTimeout(openDropdown, 400);
  });
  dropdown.appendChild(refreshBtn);

  document.body.appendChild(dropdown);
}

// ── Template selection ─────────────────────────────────────────────────────
function selectTemplate(tmpl) {
  if (dropdown) { dropdown.remove(); dropdown = null; }

  const leadData = extractLeadData(tmpl.title);
  if (leadData) {
    chrome.runtime.sendMessage({ type: "SAVE_LEAD", payload: leadData });
    console.log("[Focus] lead saved:", leadData.name);
  }

  injectText(tmpl.body);

  if (tmpl.imageFilename) injectImage(tmpl.imageFilename);

  showToast(leadData ? `✓ ${leadData.name} added as lead` : "✓ Template inserted");
}

// ── Text injection ─────────────────────────────────────────────────────────
function injectText(text) {
  if (!activeEditor) return;
  activeEditor.focus();
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, text);

  if (!activeEditor.textContent.includes(text.substring(0, 20))) {
    activeEditor.textContent = text;
    activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// ── Image injection ────────────────────────────────────────────────────────
function injectImage(filename) {
  const scope = activePostEl || document.body;
  chrome.runtime.sendMessage({ type: "GET_IMAGE", path: `/linkedin-images/${filename}` }, ({ dataUrl }) => {
    if (!dataUrl) return;
    const fileInput = scope.querySelector('input[type="file"][accept*="image"]');
    if (!fileInput) return;
    fetch(dataUrl).then(r => r.blob()).then(blob => {
      const file = new File([blob], filename, { type: blob.type });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    }).catch(() => {});
  });
}

// ── Lead extraction ────────────────────────────────────────────────────────
function extractLeadData(templateTitle) {
  const post = activePostEl;
  if (!post) return null;

  const authorLink =
    post.querySelector('.update-components-actor__meta a[href*="/in/"]') ||
    post.querySelector('.feed-shared-actor__meta a[href*="/in/"]') ||
    post.querySelector('a[href*="linkedin.com/in/"]');

  const nameEl =
    post.querySelector('.update-components-actor__name span[aria-hidden="true"]') ||
    post.querySelector('.update-components-actor__name') ||
    post.querySelector('.feed-shared-actor__name') ||
    (authorLink?.querySelector('span[aria-hidden="true"]'));

  const headlineEl =
    post.querySelector('.update-components-actor__description span[aria-hidden="true"]') ||
    post.querySelector('.update-components-actor__description') ||
    post.querySelector('.feed-shared-actor__description');

  const avatarEl = post.querySelector('.update-components-actor__avatar img, .feed-shared-actor__avatar img');

  const name = nameEl?.textContent?.trim() || authorLink?.textContent?.trim();
  if (!name) return null;

  const linkedinUrl = (authorLink?.href || "").split("?")[0];
  const headline = headlineEl?.textContent?.trim() || null;
  const company = headline?.match(/ at (.+)$/i)?.[1] ?? null;

  return {
    name,
    headline,
    company,
    linkedinUrl,
    profilePictureUrl: avatarEl?.src || null,
    postUrl: window.location.href,
    templateUsed: templateTitle,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function findPostArticle(el) {
  let cur = el;
  while (cur && cur !== document.body) {
    if (
      cur.tagName === "ARTICLE" ||
      cur.classList.contains("feed-shared-update-v2") ||
      cur.classList.contains("occludable-update") ||
      cur.dataset.urn?.includes("activity")
    ) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function showToast(message) {
  document.querySelector(".focus-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "focus-toast";
  const dot = document.createElement("div");
  dot.className = "focus-toast-dot";
  toast.appendChild(dot);
  toast.appendChild(document.createTextNode(message));
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function removeUI() {
  floatingBtn?.remove(); floatingBtn = null;
  dropdown?.remove(); dropdown = null;
  activeEditor = null;
  activePostEl = null;
}

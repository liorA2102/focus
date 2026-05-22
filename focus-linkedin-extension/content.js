/*
 * Focus LinkedIn Assistant — content script
 */

const FOCUS_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20">
  <circle cx="16" cy="16" r="16" fill="#E8533A"/>
  <rect x="10" y="9" width="5" height="14" rx="2" fill="white"/>
  <rect x="17" y="9" width="5" height="9" rx="2" fill="white"/>
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

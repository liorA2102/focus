/*
 * Focus LinkedIn Assistant — content script
 * Watches DOM for comment editors. Attaches button immediately on add, removes on DOM removal.
 * No focus/blur handling — avoids LinkedIn's React re-render flicker entirely.
 */

const FOCUS_LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M27 0C41.9117 0 54 12.0883 54 27C54 41.9117 41.9117 54 27 54C12.0883 54 0 41.9117 0 27C0 12.0883 12.0883 0 27 0ZM25 4C12.2975 4 2 14.2975 2 27C2 39.7025 12.2975 50 25 50C37.7025 50 48 39.7025 48 27C48 14.2975 37.7025 4 25 4Z" fill="#F05851"/>
<path d="M24 5C36.1503 5 46 14.8497 46 27C46 39.1503 36.1503 49 24 49C11.8497 49 2 39.1503 2 27C2 14.8497 11.8497 5 24 5ZM21.5 7C10.7304 7 2 15.9543 2 27C2 38.0457 10.7304 47 21.5 47C32.2696 47 41 38.0457 41 27C41 15.9543 32.2696 7 21.5 7Z" fill="#F05851"/>
<path d="M2.00488 26.584C2.22035 16.2827 10.4181 8 20.5 8C30.7173 8 39 16.5066 39 27C39 37.4934 30.7173 46 20.5 46C10.4423 46 2.25904 37.7571 2.00586 27.4902L2.00488 27.4131C2.22398 36.0587 9.30155 43 18 43C26.8366 43 34 35.8366 34 27C34 18.1634 26.8366 11 18 11C9.30253 11 2.2255 17.9397 2.00488 26.584ZM2.00488 26.584C2.00135 26.7222 2 26.8609 2 27C2 26.861 2.00199 26.7223 2.00488 26.584Z" fill="#F05851"/>
<path d="M2.00391 26.6504C2.18349 18.5276 8.60483 12 16.5 12C24.5081 12 31 18.7157 31 27C31 35.2843 24.5081 42 16.5 42C8.61686 42 2.20317 35.4923 2.00488 27.3867L2.00391 27.3359C2.17523 34.3604 7.70444 40 14.5 40C21.4036 40 27 34.1797 27 27C27 19.8203 21.4036 14 14.5 14C7.70884 14 2.18206 19.6323 2.00391 26.6504ZM2.00391 26.6504C2.00096 26.7665 2 26.8831 2 27C2 26.8831 2.00134 26.7666 2.00391 26.6504Z" fill="#F05851"/>
<path d="M13.5 16C19.8513 16 25 20.9249 25 27C25 33.0751 19.8513 38 13.5 38C7.14873 38 2 33.0751 2 27C2 20.9249 7.14873 16 13.5 16ZM11.5 18C6.25329 18 2 22.0294 2 27C2 31.9706 6.25329 36 11.5 36C16.7467 36 21 31.9706 21 27C21 22.0294 16.7467 18 11.5 18Z" fill="#F05851"/>
</svg>`;

let templates = [];
let activeDropdown = null;
let activeDropdownEditor = null;

console.log("[Focus] loaded");
loadTemplates();

// ── Watch DOM for comment editors appearing ────────────────────────────────
const domObserver = new MutationObserver(scanForEditors);
domObserver.observe(document.body, { childList: true, subtree: true });
scanForEditors();

function scanForEditors() {
  document.querySelectorAll('div[contenteditable="true"]').forEach((editor) => {
    if (editor.dataset.focusDone) return;

    // Skip main post composer
    if (editor.closest('[data-testid="share-box"]')) return;
    if (editor.closest('.share-creation-state')) return;
    if (editor.closest('.msg-form__contenteditable')) return; // DM box

    editor.dataset.focusDone = "1";
    console.log("[Focus] editor found, attaching button");
    attachButton(editor);
  });
}

// ── Button ─────────────────────────────────────────────────────────────────
function attachButton(editor) {
  const btn = document.createElement("button");
  btn.className = "focus-btn";
  btn.title = "Focus – Insert template";
  btn.innerHTML = FOCUS_LOGO_SVG;

  // Position fixed, anchored to editor's bottom-right corner
  positionBtn(btn, editor);
  document.body.appendChild(btn);

  // Reposition on scroll/resize
  const reposition = () => positionBtn(btn, editor);
  window.addEventListener("scroll", reposition, { passive: true });
  window.addEventListener("resize", reposition, { passive: true });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeDropdown && activeDropdownEditor === editor) {
      closeDropdown();
    } else {
      closeDropdown();
      openDropdown(editor, btn);
    }
  });

  // Remove button when editor leaves DOM
  const removalWatcher = new MutationObserver(() => {
    if (!document.body.contains(editor)) {
      btn.remove();
      closeDropdown();
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
      removalWatcher.disconnect();
    }
  });
  removalWatcher.observe(document.body, { childList: true, subtree: true });
}

function positionBtn(btn, editor) {
  const rect = editor.getBoundingClientRect();
  if (!rect.width) return;
  btn.style.top  = (rect.bottom - 38 + window.scrollY) + "px";
  btn.style.left = (rect.right  - 38 + window.scrollX) + "px";
}

// ── Dropdown ───────────────────────────────────────────────────────────────
function openDropdown(editor, btn) {
  const dd = document.createElement("div");
  dd.className = "focus-dropdown";

  const btnRect = btn.getBoundingClientRect();
  dd.style.position = "absolute";
  dd.style.top  = (btnRect.top - 8 + window.scrollY) + "px";
  dd.style.left = (btnRect.right - 280 + window.scrollX) + "px";
  dd.style.zIndex = "100000";
  dd.style.transform = "translateY(-100%)";

  const header = document.createElement("div");
  header.className = "focus-dropdown-header";
  header.textContent = "Focus Templates";
  dd.appendChild(header);

  if (!templates.length) {
    const empty = document.createElement("div");
    empty.className = "focus-empty";
    empty.textContent = "No templates yet — add in Focus app → Leads";
    dd.appendChild(empty);
  } else {
    templates.forEach((tmpl) => {
      const item = document.createElement("button");
      item.className = "focus-template-item";

      const thumb = document.createElement("div");
      if (tmpl.imageFilename) {
        const img = document.createElement("img");
        img.className = "focus-template-thumb";
        img.src = `http://localhost:3001/linkedin-images/${tmpl.imageFilename}`;
        thumb.appendChild(img);
      } else {
        thumb.className = "focus-template-placeholder";
        thumb.textContent = "💬";
      }

      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;text-align:left;";
      info.innerHTML = `<div class="focus-template-title">${tmpl.title}</div>
        <div class="focus-template-preview">${tmpl.body.substring(0, 60)}${tmpl.body.length > 60 ? "…" : ""}</div>`;

      item.appendChild(thumb);
      item.appendChild(info);
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        selectTemplate(tmpl, editor);
      });
      dd.appendChild(item);
    });
  }

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "focus-template-item";
  refreshBtn.style.cssText = "border-top:1px solid #f0f0f0;margin-top:4px;color:#888;font-size:11px;justify-content:center;";
  refreshBtn.textContent = "↺ Refresh templates";
  refreshBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    loadTemplates(true);
    closeDropdown();
    setTimeout(() => openDropdown(editor, btn), 400);
  });
  dd.appendChild(refreshBtn);

  document.body.appendChild(dd);
  activeDropdown = dd;
  activeDropdownEditor = editor;

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", outsideClickHandler, { capture: true, once: true });
  }, 0);
}

function outsideClickHandler(e) {
  if (activeDropdown && !activeDropdown.contains(e.target)) {
    closeDropdown();
  } else if (activeDropdown) {
    // Re-register if click was inside dropdown
    setTimeout(() => {
      document.addEventListener("click", outsideClickHandler, { capture: true, once: true });
    }, 0);
  }
}

function closeDropdown() {
  activeDropdown?.remove();
  activeDropdown = null;
  activeDropdownEditor = null;
}

// ── Template selection ─────────────────────────────────────────────────────
function selectTemplate(tmpl, editor) {
  closeDropdown();

  const post = findPostArticle(editor);
  const leadData = extractLeadData(post, tmpl.title);
  if (leadData) {
    chrome.runtime.sendMessage({ type: "SAVE_LEAD", payload: leadData });
    console.log("[Focus] lead saved:", leadData.name);
  }

  injectText(editor, tmpl.body);
  if (tmpl.imageFilename) injectImage(tmpl.imageFilename, post || document.body);
  showToast(leadData ? `✓ ${leadData.name} added as lead` : "✓ Template inserted");
}

// ── Text injection ─────────────────────────────────────────────────────────
function injectText(editor, text) {
  editor.focus();
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, text);
  if (!editor.textContent.includes(text.substring(0, 20))) {
    editor.textContent = text;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// ── Image injection ────────────────────────────────────────────────────────
function injectImage(filename, scope) {
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
function extractLeadData(post, templateTitle) {
  if (!post) return null;

  const authorLink =
    post.querySelector('.update-components-actor__meta a[href*="/in/"]') ||
    post.querySelector('.feed-shared-actor__meta a[href*="/in/"]') ||
    post.querySelector('a[href*="linkedin.com/in/"]');

  const nameEl =
    post.querySelector('.update-components-actor__name span[aria-hidden="true"]') ||
    post.querySelector('.update-components-actor__name') ||
    post.querySelector('.feed-shared-actor__name') ||
    authorLink?.querySelector('span[aria-hidden="true"]');

  const headlineEl =
    post.querySelector('.update-components-actor__description span[aria-hidden="true"]') ||
    post.querySelector('.update-components-actor__description') ||
    post.querySelector('.feed-shared-actor__description');

  const avatarEl = post.querySelector('.update-components-actor__avatar img, .feed-shared-actor__avatar img');

  const name = nameEl?.textContent?.trim() || authorLink?.textContent?.trim();
  if (!name) return null;

  const linkedinUrl = (authorLink?.href || "").split("?")[0];
  const headline = headlineEl?.textContent?.trim() || null;

  return {
    name,
    headline,
    company: headline?.match(/ at (.+)$/i)?.[1] ?? null,
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
      cur.dataset?.urn?.includes("activity")
    ) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function loadTemplates(force = false) {
  chrome.runtime.sendMessage({ type: "GET_TEMPLATES", force }, (res) => {
    if (chrome.runtime.lastError) return;
    templates = res ?? [];
    console.log("[Focus] templates:", templates.length);
  });
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

/*
 * Focus LinkedIn Assistant — content script
 * Injects a floating button next to LinkedIn comment boxes.
 * Clicking it opens a template picker that inserts text (and optionally image).
 * On selection, the post author is captured and saved as a lead in Focus.
 */

const FOCUS_LOGO = chrome.runtime.getURL("icons/icon48.png");

// ── State ──────────────────────────────────────────────────────────────────
let activeEditor = null;    // the comment contenteditable
let activePostEl = null;    // the post article wrapping the editor
let floatingBtn = null;
let dropdown = null;
let templates = [];

// ── Boot ───────────────────────────────────────────────────────────────────
loadTemplates();
observeDOM();

// ── Template loading ───────────────────────────────────────────────────────
function loadTemplates(force = false) {
  chrome.runtime.sendMessage({ type: "GET_TEMPLATES", force }, (res) => {
    templates = res ?? [];
  });
}

// ── DOM observation ────────────────────────────────────────────────────────
function observeDOM() {
  const observer = new MutationObserver(() => scanForEditors());
  observer.observe(document.body, { childList: true, subtree: true });
  scanForEditors();
}

function scanForEditors() {
  // LinkedIn comment editors have role="textbox" and a specific class
  const editors = document.querySelectorAll(
    '.comments-comment-box__editor [contenteditable="true"], ' +
    '.comments-comment-texteditor [contenteditable="true"], ' +
    '[data-placeholder][contenteditable="true"]'
  );

  editors.forEach((editor) => {
    if (editor.dataset.focusAttached) return;
    editor.dataset.focusAttached = "1";

    editor.addEventListener("focus", () => {
      activeEditor = editor;
      activePostEl = findPostArticle(editor);
      attachButton(editor);
    });

    editor.addEventListener("blur", (e) => {
      // Delay removal so click on button/dropdown registers first
      setTimeout(() => {
        if (!dropdown || !dropdown.matches(":hover")) {
          removeUI();
        }
      }, 200);
    });
  });
}

// ── Button & dropdown ──────────────────────────────────────────────────────
function attachButton(editor) {
  removeUI();

  const wrap = getPositionedWrapper(editor);
  if (!wrap) return;

  floatingBtn = document.createElement("button");
  floatingBtn.className = "focus-btn";
  floatingBtn.title = "Focus – Insert template";

  const img = document.createElement("img");
  img.src = FOCUS_LOGO;
  img.alt = "Focus";
  floatingBtn.appendChild(img);

  wrap.style.position = wrap.style.position || "relative";
  wrap.appendChild(floatingBtn);

  floatingBtn.addEventListener("mousedown", (e) => {
    e.preventDefault(); // prevent editor blur
    toggleDropdown();
  });
}

function toggleDropdown() {
  if (dropdown) {
    dropdown.remove();
    dropdown = null;
    return;
  }
  openDropdown();
}

function openDropdown() {
  dropdown = document.createElement("div");
  dropdown.className = "focus-dropdown";

  const header = document.createElement("div");
  header.className = "focus-dropdown-header";
  header.textContent = "Focus Templates";
  dropdown.appendChild(header);

  if (!templates || templates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-empty";
    empty.textContent = "No templates yet — add them in the Focus app";
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
      info.style.flex = "1";
      info.style.minWidth = "0";

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

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectTemplate(tmpl);
      });

      dropdown.appendChild(item);
    });
  }

  // Refresh button at bottom
  const refreshBtn = document.createElement("button");
  refreshBtn.className = "focus-template-item";
  refreshBtn.style.borderTop = "1px solid #f0f0f0";
  refreshBtn.style.marginTop = "4px";
  refreshBtn.style.color = "#888";
  refreshBtn.style.fontSize = "11px";
  refreshBtn.style.justifyContent = "center";
  refreshBtn.textContent = "↺ Refresh templates";
  refreshBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    loadTemplates(true);
    dropdown.remove();
    dropdown = null;
    setTimeout(openDropdown, 300);
  });
  dropdown.appendChild(refreshBtn);

  floatingBtn.parentElement.appendChild(dropdown);
}

// ── Template selection ─────────────────────────────────────────────────────
function selectTemplate(tmpl) {
  if (dropdown) { dropdown.remove(); dropdown = null; }

  // 1. Capture lead BEFORE focusing editor (author data from current post)
  const leadData = extractLeadData(tmpl.title);
  if (leadData) {
    chrome.runtime.sendMessage({ type: "SAVE_LEAD", payload: leadData });
  }

  // 2. Insert text into editor
  injectText(tmpl.body);

  // 3. Attach image if template has one
  if (tmpl.imageFilename) {
    injectImage(tmpl.imageFilename, activePostEl || document.body);
  }

  // 4. Show toast
  showToast(leadData ? `✓ ${leadData.name} added as lead` : "✓ Template inserted");
}

// ── Text injection ─────────────────────────────────────────────────────────
function injectText(text) {
  if (!activeEditor) return;
  activeEditor.focus();

  // Clear existing content and insert new text
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, text);

  // If execCommand doesn't work (some LinkedIn builds), fall back to input event
  if (!activeEditor.textContent.includes(text.substring(0, 20))) {
    activeEditor.textContent = text;
    activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// ── Image injection ────────────────────────────────────────────────────────
function injectImage(filename, scope) {
  // Ask background to fetch the image as a data URL, then create a File
  chrome.runtime.sendMessage(
    { type: "GET_IMAGE", path: `/linkedin-images/${filename}` },
    ({ dataUrl }) => {
      if (!dataUrl) return;

      // Find LinkedIn's hidden file input near the comment box
      const fileInput = scope.querySelector('input[type="file"][accept*="image"]');
      if (!fileInput) return;

      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const ext = filename.split(".").pop() || "png";
          const file = new File([blob], filename, { type: blob.type || `image/${ext}` });
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        })
        .catch(() => {
          // Image injection failed — user can attach manually
        });
    }
  );
}

// ── Lead data extraction ───────────────────────────────────────────────────
function extractLeadData(templateTitle) {
  const post = activePostEl || findNearestPost(activeEditor);
  if (!post) return null;

  // Author link — LinkedIn renders the post author in a few different ways
  const authorLink =
    post.querySelector('.update-components-actor__meta a[href*="/in/"]') ||
    post.querySelector('.feed-shared-actor__meta a[href*="/in/"]') ||
    post.querySelector('a[href*="linkedin.com/in/"]');

  const nameEl =
    post.querySelector('.update-components-actor__name') ||
    post.querySelector('.feed-shared-actor__name') ||
    post.querySelector('.update-components-actor__title') ||
    (authorLink && authorLink.querySelector('span[aria-hidden="true"]'));

  const headlineEl =
    post.querySelector('.update-components-actor__description') ||
    post.querySelector('.feed-shared-actor__description');

  const avatarEl = post.querySelector('.update-components-actor__avatar img, .feed-shared-actor__avatar img');

  const name = nameEl?.textContent?.trim() || authorLink?.textContent?.trim() || null;
  if (!name) return null;

  const rawUrl = authorLink?.href || "";
  const linkedinUrl = rawUrl.split("?")[0]; // strip query params

  const headline = headlineEl?.textContent?.trim() || null;
  const profilePictureUrl = avatarEl?.src || null;
  const postUrl = window.location.href;

  // Try to extract company from headline "Title at Company"
  const company = headline ? (headline.match(/ at (.+)$/i)?.[1] ?? null) : null;

  return { name, headline, company, linkedinUrl, profilePictureUrl, postUrl, templateUsed: templateTitle };
}

// ── DOM helpers ────────────────────────────────────────────────────────────
function findPostArticle(el) {
  let cur = el;
  while (cur && cur !== document.body) {
    if (cur.tagName === "ARTICLE" || cur.classList.contains("feed-shared-update-v2") || cur.classList.contains("occludable-update")) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

function findNearestPost(el) {
  return findPostArticle(el);
}

function getPositionedWrapper(editor) {
  // Walk up until we find a box that contains the editor buttons area
  let cur = editor.parentElement;
  for (let i = 0; i < 8; i++) {
    if (!cur || cur === document.body) break;
    if (cur.classList.contains("comments-comment-box") ||
        cur.classList.contains("comments-comment-box--cr") ||
        cur.classList.contains("comments-comment-texteditor")) {
      return cur;
    }
    cur = cur.parentElement;
  }
  // Fall back to direct parent
  return editor.parentElement;
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(message) {
  const existing = document.querySelector(".focus-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "focus-toast";

  const dot = document.createElement("div");
  dot.className = "focus-toast-dot";
  toast.appendChild(dot);
  toast.appendChild(document.createTextNode(message));

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Cleanup ────────────────────────────────────────────────────────────────
function removeUI() {
  if (floatingBtn) { floatingBtn.remove(); floatingBtn = null; }
  if (dropdown) { dropdown.remove(); dropdown = null; }
  activeEditor = null;
  activePostEl = null;
}

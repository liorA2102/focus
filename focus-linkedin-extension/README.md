# Focus LinkedIn Extension

Chrome extension that overlays on LinkedIn and lets Jacob paste saved comment templates onto posts.
When a template is used, the post author is automatically saved as a lead in the Focus app.

## How to install

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder: `focus-linkedin-extension/`

The Focus Group logo will appear in your Chrome toolbar.

## How to use

1. Make sure the Focus app is running at `http://localhost:3001`
2. Go to LinkedIn and open a post's comment box
3. A small **Focus logo button** appears at the bottom-right of the comment box
4. Click it → pick a template from the list
5. The comment text is auto-inserted. If the template has an image, it's attached too.
6. The post author is silently added to your Leads list in Focus.

## Managing templates

Go to **Focus app → Leads → Comment Templates** to add, edit, or delete templates.

## Notes

- The extension only talks to `localhost:3001` — no data leaves your machine.
- If the Focus app is offline when you comment, the lead is not saved (no retry).
- To refresh the template list without reloading Chrome, use the ↺ button at the bottom of the picker.

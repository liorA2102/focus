/*
 * Run once to generate 16/48/128px PNG icons from the Focus logo.
 * Usage: node generate-icons.js
 * Requires: npm install sharp (run in this directory)
 */
const sharp = require("sharp");
const path = require("path");

const src = path.join(__dirname, "../public/logos/FocusGroup_LogoFIXED.png");

[16, 48, 128].forEach((size) => {
  sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(__dirname, "icons", `icon${size}.png`))
    .then(() => console.log(`✓ icon${size}.png`))
    .catch(console.error);
});

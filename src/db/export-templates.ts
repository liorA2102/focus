// Run with: npm run db:export-templates
// Exports current templates to src/db/seeds/templates.json and commits them.
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "focus.db");
const sqlite = new Database(DB_PATH);

const rows = sqlite.prepare(
  "SELECT title, body, image_filename as imageFilename, language FROM comment_templates ORDER BY id"
).all() as Array<{ title: string; body: string; imageFilename: string | null; language: string }>;

const seedPath = path.join(process.cwd(), "src/db/seeds/templates.json");
fs.writeFileSync(seedPath, JSON.stringify(rows, null, 2) + "\n");

console.log(`✅ Exported ${rows.length} template(s) to src/db/seeds/templates.json`);
console.log("   Commit and push to share with Jacob's PC.");
sqlite.close();

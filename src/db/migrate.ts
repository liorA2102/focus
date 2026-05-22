import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { commentTemplates } from "./schema";

const DB_PATH = path.join(process.cwd(), "focus.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
console.log("✅ Database migrated successfully");

// Seed templates from seeds/templates.json — insert any that don't exist yet (matched by title)
const seedPath = path.join(process.cwd(), "src/db/seeds/templates.json");
if (fs.existsSync(seedPath)) {
  const seeds = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as Array<{
    title: string; body: string; imageFilename: string | null; language: string;
  }>;

  let seeded = 0;
  for (const tmpl of seeds) {
    const existing = db.select().from(commentTemplates).where(eq(commentTemplates.title, tmpl.title)).get();
    if (!existing) {
      db.insert(commentTemplates).values({
        title: tmpl.title,
        body: tmpl.body,
        imageFilename: tmpl.imageFilename ?? null,
        language: tmpl.language ?? "he",
      }).run();
      seeded++;
    }
  }
  if (seeded > 0) console.log(`✅ Seeded ${seeded} comment template(s)`);
}

sqlite.close();

/**
 * One-time migration: create client records from unique position.client text values,
 * then link positions to the new client records via clientId.
 *
 * Safe to re-run (idempotent).
 * Usage: npx tsx src/db/migrate-clients.ts
 */

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "focus.db");
const db = new Database(dbPath);

const uniqueClients = db
  .prepare("SELECT DISTINCT client FROM positions WHERE client IS NOT NULL AND client != ''")
  .all() as { client: string }[];

let created = 0;
let linked = 0;

for (const { client } of uniqueClients) {
  // Guard: skip if a client with this name already exists
  const existing = db
    .prepare("SELECT id FROM clients WHERE name = ?")
    .get(client) as { id: number } | undefined;

  let clientId: number;

  if (existing) {
    clientId = existing.id;
  } else {
    const result = db
      .prepare("INSERT INTO clients (name, created_at) VALUES (?, ?)")
      .run(client, new Date().toISOString());
    clientId = result.lastInsertRowid as number;
    created++;
  }

  // Link unlinked positions that match this client text
  const update = db
    .prepare("UPDATE positions SET client_id = ? WHERE client = ? AND client_id IS NULL")
    .run(clientId, client);
  linked += update.changes;
}

console.log(`Done. Created ${created} client records, linked ${linked} positions.`);
db.close();

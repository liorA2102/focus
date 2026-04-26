import { db } from "./index.js";
import { positions } from "./schema.js";
import { desc } from "drizzle-orm";

async function main() {
  const all = await db.query.positions.findMany({
    orderBy: [desc(positions.createdAt)],
    with: { matches: true },
  });
  console.log("count:", all.length);
  if (all.length) console.log("first:", all[0].title, all[0].status);
}

main().catch(console.error);

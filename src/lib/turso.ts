import { createClient } from "@libsql/client";

function getClient() {
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;
  if (!url || !authToken) return null;
  return createClient({ url, authToken });
}

type PublicPosition = {
  id: number;
  title: string;
  location: string | null;
  salaryRange: string | null;
  description: string | null;
  requirements: string | null;
  createdAt: string;
};

export async function syncPositionToTurso(p: PublicPosition) {
  const client = getClient();
  if (!client) return;
  // client column kept in Turso schema but always blanked — company names are confidential
  await client.execute({
    sql: `INSERT INTO positions (id, title, client, location, salary_range, description, requirements, created_at)
          VALUES (?, ?, '', ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            client = '',
            location = excluded.location,
            salary_range = excluded.salary_range,
            description = excluded.description,
            requirements = excluded.requirements`,
    args: [p.id, p.title, p.location, p.salaryRange, p.description, p.requirements, p.createdAt],
  });
}

export async function readPositionsFromTurso() {
  const client = getClient();
  if (!client) return [];
  const result = await client.execute("SELECT id, title, client, location FROM positions LIMIT 20");
  return result.rows;
}

export async function purgeStalePositionsFromTurso(openIds: number[]) {
  const client = getClient();
  if (!client) return;
  if (openIds.length === 0) {
    await client.execute("DELETE FROM positions");
    return;
  }
  const placeholders = openIds.map(() => "?").join(", ");
  await client.execute({
    sql: `DELETE FROM positions WHERE id NOT IN (${placeholders})`,
    args: openIds,
  });
}

export async function removePositionFromTurso(id: number) {
  const client = getClient();
  if (!client) return;
  await client.execute({ sql: `DELETE FROM positions WHERE id = ?`, args: [id] });
}

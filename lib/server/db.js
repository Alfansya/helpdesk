import pg from 'pg';

// Satu pool per instance serverless; dipakai ulang antar request (hot reload aman lewat globalThis).
function getPool() {
  if (!globalThis.__pgPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur');
    globalThis.__pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase memakai SSL
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return globalThis.__pgPool;
}

export const query = (text, params) => getPool().query(text, params);

export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const { createClient } = require("@libsql/client");

let client = null;

async function getDb() {
  if (client) return client;

  client = createClient({
    url: process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? "file:/tmp/local.db" : "file:local.db"),
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )`,
    ],
    "write"
  );

  // Migration : ajouter la colonne title si elle n'existe pas encore
  try {
    await client.execute("ALTER TABLE conversations ADD COLUMN title TEXT");
  } catch (_) {
    // Colonne déjà présente, on ignore
  }

  return client;
}

module.exports = { getDb };

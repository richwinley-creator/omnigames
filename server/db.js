import pg from 'pg';
import { hashSync } from 'bcryptjs';

const { Pool } = pg;

// --- Connection ---
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: Missing DATABASE_URL environment variable');
  console.error('Set it to your Supabase Postgres connection string');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors gracefully (Supabase pooler can drop idle connections)
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

// Retry wrapper for transient Supabase pooler auth failures
async function queryWithRetry(sql, params, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (err.code === '28P01' && attempt < retries) {
        // Password auth failed — transient pooler issue, retry
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
}

// --- SQLite-compatible wrapper ---
// This lets existing routes use db.prepare(sql).get(...) / .all(...) / .run(...)
// without rewriting every file. Converts ? placeholders to $1, $2, etc.

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function convertSQLiteFunctions(sql) {
  return sql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/REAL/gi, 'DOUBLE PRECISION')
    .replace(/TEXT DEFAULT \(NOW\(\)\)/gi, 'TIMESTAMPTZ DEFAULT NOW()')
    // SQLite's DEFAULT (datetime('now')) was already replaced above
    ;
}

const db = {
  prepare(sql) {
    const pgSql = convertPlaceholders(convertSQLiteFunctions(sql));
    return {
      async get(...params) {
        const result = await queryWithRetry(pgSql, params);
        return result.rows[0] || null;
      },
      async all(...params) {
        const result = await queryWithRetry(pgSql, params);
        return result.rows;
      },
      async run(...params) {
        const result = await queryWithRetry(pgSql, params);
        return {
          lastInsertRowid: result.rows?.[0]?.id ?? null,
          changes: result.rowCount,
        };
      },
    };
  },

  async exec(sql) {
    const pgSql = convertSQLiteFunctions(sql);
    await queryWithRetry(pgSql);
  },

  transaction(fn) {
    // Returns a function that, when called, runs fn inside a transaction
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Temporarily swap pool.query to use client.query
        const origQuery = pool.query.bind(pool);
        pool.query = client.query.bind(client);
        await fn(...args);
        pool.query = origQuery;
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  },

  pool, // expose for direct access if needed
};

export default db;

// --- Schema creation ---
async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sheet_name TEXT NOT NULL,
      machines INTEGER NOT NULL,
      gse_pct INTEGER NOT NULL,
      partner TEXT NOT NULL,
      partner_pct INTEGER NOT NULL,
      machine_type TEXT DEFAULT 'Banilla',
      status TEXT DEFAULT 'active',
      address TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      install_date TEXT,
      rev_share_notes TEXT,
      state TEXT DEFAULT 'TX',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS readings (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      date TEXT NOT NULL,
      machine_name TEXT NOT NULL,
      prev_in DOUBLE PRECISION DEFAULT 0,
      curr_in DOUBLE PRECISION DEFAULT 0,
      prev_out DOUBLE PRECISION DEFAULT 0,
      curr_out DOUBLE PRECISION DEFAULT 0,
      total_in DOUBLE PRECISION GENERATED ALWAYS AS (curr_in - prev_in) STORED,
      total_out DOUBLE PRECISION GENERATED ALWAYS AS (curr_out - prev_out) STORED,
      net DOUBLE PRECISION GENERATED ALWAYS AS ((curr_in - prev_in) - (curr_out - prev_out)) STORED,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      bank TEXT DEFAULT 'Bank of America',
      ref TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      partner TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      period TEXT,
      status TEXT DEFAULT 'unpaid',
      paid_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS jvl_deals (
      id SERIAL PRIMARY KEY,
      business_name TEXT NOT NULL,
      contact TEXT,
      stage TEXT DEFAULT 'new',
      games INTEGER DEFAULT 0,
      commission DOUBLE PRECISION DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'team',
      active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      business_name TEXT,
      business_type TEXT,
      city TEXT,
      state TEXT DEFAULT 'TX',
      interest TEXT,
      brand_preference TEXT,
      machines_wanted TEXT,
      message TEXT,
      sms_consent INTEGER DEFAULT 0,
      stage TEXT DEFAULT 'prospect',
      assigned_to INTEGER REFERENCES users(id),
      source TEXT DEFAULT 'website',
      formspree_id TEXT,
      notes TEXT,
      follow_up_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fills (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      date TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      filled_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS service_tickets (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id),
      machine_name TEXT,
      issue_type TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'open',
      assigned_to INTEGER REFERENCES users(id),
      resolved_at TEXT,
      resolution_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      outcome TEXT,
      duration_mins INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      assigned_to INTEGER REFERENCES users(id),
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      completed_at TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      user_id INTEGER,
      user_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      read INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed default admin user if no users exist
  const userCount = await pool.query('SELECT COUNT(*) as c FROM users');
  if (parseInt(userCount.rows[0].c) === 0) {
    await pool.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4)',
      ['admin', hashSync('gseskillgames2026', 10), 'Admin', 'admin']
    );
    console.log('Default admin user created (username: admin)');
  }

  // Seed locations if empty
  const locCount = await pool.query('SELECT COUNT(*) as c FROM locations');
  if (parseInt(locCount.rows[0].c) === 0) {
    const locations = [
      ["Cloudzzz Premont", "Cloudzzz", 5, 50, "Split", 50, "Banilla"],
      ["76 Gas Station", "76_Gas", 5, 50, "76", 50, "Banilla"],
      ["Mesquite House BBQ", "Mesquite", 3, 60, "MH", 40, "TOG"],
      ["KingsVille Food Mart", "Kingsville", 3, 50, "Split", 50, "Banilla"],
      ["KingsWings", "KingsWings", 3, 60, "LF", 40, "TOG"],
      ["BestWestner", "BestWestern", 4, 60, "BW", 40, "Banilla"],
      ["Golf Palace", "GolfPalace", 5, 70, "Golf", 30, "Banilla"],
      ["Quarter Bar", "QuarterBar", 3, 70, "Quarter", 30, "Banilla"],
      ["Dive Bar", "DiveBar", 6, 70, "LACA", 30, "Banilla"],
      ["Caberas Meat Market", "Caberas", 5, 70, "LACA", 30, "Banilla"],
      ["La Colmena", "LaColmena", 4, 70, "LACA", 30, "Banilla"],
      ["King Super Store", "KingSuperStore", 3, 60, "SP", 40, "TOG"],
      ["Cloudzzz #2 Fla", "Cloudzzz2", 5, 50, "Split", 50, "Banilla"],
    ];

    for (const loc of locations) {
      await pool.query(
        'INSERT INTO locations (name, sheet_name, machines, gse_pct, partner, partner_pct, machine_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        loc
      );
    }

    // Seed deposits
    const deps = [
      ["2026-01-27", 28311, "Bank of America", "Seq# 072"],
      ["2026-02-12", 8400, "Bank of America", "Seq# 049"],
      ["2026-02-13", 8247, "Bank of America", "Seq# 087"],
    ];
    for (const d of deps) {
      await pool.query('INSERT INTO deposits (date, amount, bank, ref) VALUES ($1, $2, $3, $4)', d);
    }

    console.log('Database seeded with 13 locations and 3 deposits');
  }

  console.log('Database initialized');
}

// Run init
initDatabase().catch(err => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});

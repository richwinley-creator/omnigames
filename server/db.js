import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'gse.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sheet_name TEXT NOT NULL,
    machines INTEGER NOT NULL,
    gse_pct INTEGER NOT NULL,
    partner TEXT NOT NULL,
    partner_pct INTEGER NOT NULL,
    machine_type TEXT DEFAULT 'Banilla',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    machine_name TEXT NOT NULL,
    prev_in REAL DEFAULT 0,
    curr_in REAL DEFAULT 0,
    prev_out REAL DEFAULT 0,
    curr_out REAL DEFAULT 0,
    total_in REAL GENERATED ALWAYS AS (curr_in - prev_in) STORED,
    total_out REAL GENERATED ALWAYS AS (curr_out - prev_out) STORED,
    net REAL GENERATED ALWAYS AS ((curr_in - prev_in) - (curr_out - prev_out)) STORED,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (location_id) REFERENCES locations(id)
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    bank TEXT DEFAULT 'Bank of America',
    ref TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    partner TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT,
    status TEXT DEFAULT 'unpaid',
    paid_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (location_id) REFERENCES locations(id)
  );

  CREATE TABLE IF NOT EXISTS jvl_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    contact TEXT,
    stage TEXT DEFAULT 'new',
    games INTEGER DEFAULT 0,
    commission REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'team',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    assigned_to INTEGER,
    source TEXT DEFAULT 'website',
    formspree_id TEXT,
    notes TEXT,
    follow_up_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS fills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    filled_by INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (filled_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS service_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    machine_name TEXT,
    issue_type TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    assigned_to INTEGER,
    resolved_at TEXT,
    resolution_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );
`);

// Add new columns to locations if they don't exist
const locCols = db.prepare("PRAGMA table_info(locations)").all().map(c => c.name);
const newLocCols = [
  ['address', 'TEXT'],
  ['contact_name', 'TEXT'],
  ['contact_phone', 'TEXT'],
  ['install_date', 'TEXT'],
  ['rev_share_notes', 'TEXT'],
  ['state', "TEXT DEFAULT 'TX'"],
];
for (const [col, type] of newLocCols) {
  if (!locCols.includes(col)) {
    db.exec(`ALTER TABLE locations ADD COLUMN ${col} ${type}`);
  }
}

// Seed default admin user if no users exist
import { hashSync } from 'bcryptjs';
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    'admin', hashSync('gseskillgames2026', 10), 'Admin', 'admin'
  );
  console.log('Default admin user created (username: admin)');
}

// Seed locations if empty
const count = db.prepare('SELECT COUNT(*) as c FROM locations').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO locations (name, sheet_name, machines, gse_pct, partner, partner_pct, machine_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

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

  const insertMany = db.transaction(() => {
    for (const loc of locations) insert.run(...loc);
  });
  insertMany();

  // Seed deposits
  const insertDep = db.prepare('INSERT INTO deposits (date, amount, bank, ref) VALUES (?, ?, ?, ?)');
  const seedDeps = db.transaction(() => {
    insertDep.run("2026-01-27", 28311, "Bank of America", "Seq# 072");
    insertDep.run("2026-02-12", 8400, "Bank of America", "Seq# 049");
    insertDep.run("2026-02-13", 8247, "Bank of America", "Seq# 087");
  });
  seedDeps();

  console.log('Database seeded with 13 locations and 3 deposits');
}

export default db;

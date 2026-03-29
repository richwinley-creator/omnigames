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

    CREATE TABLE IF NOT EXISTS counties (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT DEFAULT 'TX',
      status TEXT DEFAULT 'unknown',
      regulations TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      website TEXT,
      notes TEXT,
      researched_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name, state)
    );
  `);

  // Safe column migrations
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS county TEXT`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_split TEXT`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS num_games INTEGER`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS num_kiosks INTEGER`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS game_type TEXT`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'house'`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS approval_notes TEXT`);

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

  // Seed counties — ON CONFLICT DO NOTHING prevents duplicates
  {
    const counties = [
      { name: 'Upshur', state: 'TX', status: 'approved', regulations: 'No specific restrictions found. Diana area has lots of active game rooms.', website: 'https://www.countyofupshur.com', notes: 'Confirmed via research — games operating in Diana, TX without issue.' },
      { name: 'Dallas', state: 'TX', status: 'approved', regulations: 'Amusement license required per location: $39/year. Machine decals: $15/machine/year. No cap on number of machines.', contact_name: 'Dallas City Hall', contact_phone: '214-671-3001', website: 'https://dallascityhall.com/departments/waterutilities/Pages/special_collection_Licenses.aspx', notes: 'Garland, TX is primarily in Dallas County. Email: dpd@dallascityhall.com' },
      { name: 'Bexar', state: 'TX', status: 'approved', regulations: '$15/machine tax valid Jun 1 - May 31. $7.50 prorated if placed Dec 1 - May 31. $5 sealing fee per sealed machine.', website: 'https://www.sa.gov/Directory/Departments/Finance/Permits-Licenses/Amusement', notes: 'San Antonio is in Bexar County. Apply with city.' },
      { name: 'Bell', state: 'TX', status: 'restricted', regulations: 'No new game rooms being permitted within Bell County cities. Max 5 machines allowed without a game room permit. Each machine over 5 is a separate Class A misdemeanor.', contact_name: "Bell County Fire Marshal's Office", website: 'https://www.bellcountytx.com/departments/fire_marshal/ball_county_game_room_regulations.php', notes: 'Killeen, Belton, Harker Heights, Temple and other Bell County cities are affected. Can still place up to 5 machines per location.' },
      { name: 'Gregg', state: 'TX', status: 'restricted', regulations: 'Games are illegal in Gregg County per DA office. Application goes: County Clerk → Sheriff → DA office.', contact_name: 'Lisa Terry (DA Office)', contact_phone: '903-758-6181', notes: 'Gladewater and Kilgore are in Gregg County. Waiting to hear back from DA — currently treating as restricted. Gladewater partially in Upshur County.' },
      { name: 'Ellis', state: 'TX', status: 'approved', regulations: 'Skill-based games permitted. Amusement buildings permit fee: $75. Waxahachie confirmed via Texas state law (skill rather than chance).', website: 'https://www.elliscountytx.gov', notes: 'Waxahachie, Ennis, Midlothian, parts of Grand Prairie and Mansfield in Ellis County.' },
      { name: 'Galveston', state: 'TX', status: 'approved', regulations: 'Annual permit: $100/machine, expires Dec 31. No machines within 300ft of school, church, or hospital. Game room requires license from Chief of Police.', notes: 'Texas City, League City, La Marque, Dickinson, Kemah in Galveston County.' },
      { name: 'Jefferson', state: 'TX', status: 'restricted', regulations: 'Beaumont banned game rooms effective August 2025. No game rooms allowed.', website: 'https://jeffersoncountytx.gov/blobs/EnvControl/Documents/2025_Amended_Game_Room_Regulations.pdf', notes: 'Beaumont illegal since Aug 2025. Do not pursue any Jefferson County leads at this time.' },
      { name: 'Wilson', state: 'TX', status: 'approved', regulations: 'Apply with City of Floresville. Provide business info, machine info, location info. Pay permit/sticker fee. Receive approval before operating. No cash payouts allowed.', website: 'https://www.floresvilletx.gov/wp-content/uploads/2016/07/ordinance-2015-033.pdf', notes: 'Floresville is the county seat of Wilson County.' },
      { name: 'Tarrant', state: 'TX', status: 'approved', regulations: 'Game rooms approved since 2019. Arlington and surrounding Tarrant County cities permit skill games.', website: 'https://www.nbcdfw.com/news/local/tarrant-county-commissioners-approve-regulations-for-game-rooms-parlors/2141947/', notes: 'Arlington, Fort Worth area. Approved by county commissioners.' },
      { name: 'Hidalgo', state: 'TX', status: 'unknown', regulations: null, notes: 'Mission, TX is in Hidalgo County. Research needed before proceeding.' },
      { name: 'Hill', state: 'TX', status: 'unknown', regulations: null, notes: 'Whitney, TX is in Hill County. Research needed.' },
      { name: 'Johnson', state: 'TX', status: 'unknown', regulations: null, notes: 'Burleson, TX is in Johnson County. Research needed.' },
    ];
    for (const c of counties) {
      await pool.query(
        `INSERT INTO counties (name, state, status, regulations, contact_name, contact_phone, website, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (name, state) DO NOTHING`,
        [c.name, c.state, c.status, c.regulations || null, c.contact_name || null, c.contact_phone || null, c.website || null, c.notes || null]
      );
    }
    console.log('Counties seeded from spreadsheet research');
  }

  // Seed leads — skip any that already exist (matched by name + phone)
  {
    const leads = [
      // ── Active leads (Master List) ──
      { name: 'Erica Saenz', phone: '9566513867', email: 'erica.pr956@gmail.com', address: '409 Bryan Rd Suite 108, Mission, TX 78572', business_name: 't & E Vintage Compass', city: 'Mission', state: 'TX', county: 'Hidalgo', stage: 'install_scheduled', revenue_split: '60/40', num_games: 3, num_kiosks: 1, game_type: 'Games', notes: 'Had a vendor they pulled out, she wants games ASAP. Had everyone excited from the bar next door about the games and the vendor pulled out. Contract sent 3/28.' },
      { name: 'Melissa', phone: '9033995225', email: 'Hotslotzonline@gmail.com', address: '2205 US Highway 259 S, Diana, TX 75640', business_name: null, city: 'Diana', state: 'TX', county: 'Upshur', stage: 'install_scheduled', revenue_split: '40/60', num_games: 5, num_kiosks: 1, game_type: 'both', notes: "3/23 Site visited, contract signed and sent to Ashley for review. Ready to install. 3/22 Can fit 5 units. Some concerns about front door security — customer making changes and installing cameras. 3/21 Had a vendor pull her games, hasn't had games in 2 months. Was doing $1-2k per game per week!" },
      { name: 'Will Wonsick', phone: '2542479646', email: 'willwonsick@gmail.com', address: '805 W. Rancier, Killeen, TX 76541', business_name: null, city: 'Killeen', state: 'TX', county: 'Bell', stage: 'install_scheduled', revenue_split: '60/40', num_games: 5, num_kiosks: 1, game_type: 'both', notes: "Doesn't know county laws. Wants 4-5 ASAP. Knows the split. On Shan's list for delivery." },
      { name: 'Phil Carter', phone: '8179339552', email: 'Carterglobalresource@gmail.com', address: '106 E Washington Ave, Whitney, TX 76692', business_name: null, city: 'Whitney', state: 'TX', county: 'Hill', stage: 'install_scheduled', revenue_split: '40/60', num_games: 30, num_kiosks: 5, game_type: 'Games', notes: 'Willing to fill. Big location, wants 30 games. Events every weekend, 40 weekends/year, 3-6k people per event. Waiting for reports and pics. Has connection with the sheriff and city council. Ready May 4th. AK handling this lead. Website: https://gametimesb.com/' },
      { name: 'Richard Samadi', phone: '9728004553', email: 'rezasamadi37@yahoo.com', address: '4301 Saturn Rd, Garland, TX 75041', business_name: null, city: 'Garland', state: 'TX', county: 'Dallas', stage: 'site_qualified', revenue_split: '50/50', num_games: 5, num_kiosks: 1, game_type: 'Games', follow_up_date: '2026-03-26', notes: '3/27 Confirmed by laws — in Dallas County. 3/26 Site visited. Need to send contract then schedule install. Not sure about filling. Note: 50/50 split needs Rich approval per policy.' },
      { name: 'Jorge / Johnnie', phone: '4694278614', email: null, address: 'Waxahachie, TX', business_name: null, city: 'Waxahachie', state: 'TX', county: 'Ellis', stage: 'initial_contact', revenue_split: '60/40', num_games: 1, num_kiosks: 1, game_type: 'Games', follow_up_date: '2026-03-27', notes: "Jorge is the owner's nephew. Owner wasn't in. 3/27 Left voicemail and text. 3/25 F/U no response. 3/22 Owner asked to resend info. 2/24 Spoke with Johnnie — owner wanted a 30-90 day trial period, advised need Rich approval." },
      { name: 'Scott Binkley', phone: '2148688071', email: null, address: '1401 Northwest Hwy #121, Garland, TX 75041', business_name: null, city: 'Garland', state: 'TX', county: 'Dallas', stage: 'site_qualified', revenue_split: '60/40', num_games: 2, num_kiosks: 1, game_type: 'both', follow_up_date: '2026-03-26', notes: '3/26 AM visited location and have pictures (Scott never sent his). Has 2 bars, wants 2 games at each. Never had games, open to online.' },
      { name: 'Scott Binkley (Arlington)', phone: '2148688071', email: null, address: '4750 Little Rd, Arlington, TX 76017', business_name: null, city: 'Arlington', state: 'TX', county: 'Tarrant', stage: 'initial_contact', revenue_split: '60/40', num_games: 2, num_kiosks: 1, game_type: 'both', notes: 'Second location. AK followed up 3/21 — no response. Has 2 bars, wants 2 games at each.' },
      { name: 'Reid Allen Bauerschlag', phone: '5124295600', email: 'bauerschlagreid6969@gmail.com', address: 'Thorndale, TX', business_name: null, city: 'Thorndale', state: 'TX', stage: 'initial_contact', num_games: 6, num_kiosks: 1, game_type: 'Games', notes: 'Bar — interested in revenue share, games, kiosk, and ATM. AK followed up 3/21, no response.' },
      { name: 'Britt Brown', phone: '2102730877', email: 'sky9333@gmail.com', address: "Rocky's Tavern, San Antonio, TX", business_name: "Rocky's Tavern", city: 'San Antonio', state: 'TX', county: 'Bexar', stage: 'site_qualified', revenue_split: '40/60', num_games: 5, num_kiosks: 1, game_type: 'Games', notes: 'Lots of personality. Wants to take over current vendor business. In process of opening a game room, wants us to take over current 4 games. AK handling this lead.' },
      { name: 'Kayla Carr', phone: '8303991690', email: 'kaylareneecarr33@gmail.com', address: 'Adkins, TX', business_name: null, city: 'Adkins', state: 'TX', county: 'Bexar', stage: 'initial_contact', num_games: 10, num_kiosks: 2, game_type: null, notes: 'Wants to open her own game room. Has the perfect location in Adkins, TX (Bexar County). Getting details together. AK handling this lead.' },
      // ── Follow up later / pipeline leads ──
      { name: 'Jason Puryear', phone: '8172628943', email: 'Puryear.jason@gmail.com', address: 'Burleson, TX', business_name: null, city: 'Burleson', state: 'TX', county: 'Johnson', stage: 'lost', revenue_split: '40/60', num_games: 5, num_kiosks: 1, game_type: 'both', notes: 'New bar, 3000 sq ft, pool/darts/TVs. Johnson County. 2/2 Told us he went with someone else.' },
      { name: 'Sabrina', phone: '4095190399', email: 'skinternetcafe2@gmail.com', address: '2680 S 4th St, Beaumont, TX 77701', business_name: null, city: 'Beaumont', state: 'TX', county: 'Jefferson', stage: 'prospect', revenue_split: '40/60', num_games: 5, num_kiosks: 1, game_type: 'both', notes: 'COUNTY RESTRICTED — Beaumont illegal since Aug 2025. Has sweeps now, wants games ASAP, working with county for game room license. Plans to open game room in 2 months with 50 games. Contract sent by AK. Monitoring situation — revisit if county status changes.' },
      { name: 'Sean "Zoo" Dunn', phone: null, email: null, address: "ZooZoo's Smoke Shop, 12131 Highway 6 Ste 106, Fresno, TX 77545", business_name: "ZooZoo's Smoke Shop", city: 'Fresno', state: 'TX', stage: 'lost', revenue_split: '60/40', num_games: 5, num_kiosks: 1, game_type: 'both', notes: 'Was ready to move forward but legislation changed — cannot proceed with smoke shop at this time.' },
      { name: 'Lance', phone: '9032410209', email: null, address: '303 S. Tyler St, Gladewater, TX 75647', business_name: null, city: 'Gladewater', state: 'TX', county: 'Gregg', stage: 'prospect', revenue_split: '40/60', num_games: 5, num_kiosks: 1, game_type: 'Games', notes: 'COUNTY RESTRICTED — Gregg County games are illegal. 3/21 Site visited — hand car wash, Uhaul & food truck all in one location. Definitely interested if compliant. Cameras installed, metal front door, secured. Good potential. Hold pending county resolution.' },
      { name: 'Saroz', phone: '4307023008', email: null, address: '227 S Main Street, Gladewater, TX 75647', business_name: null, city: 'Gladewater', state: 'TX', county: 'Gregg', stage: 'prospect', revenue_split: null, num_games: 5, num_kiosks: 1, game_type: 'Games', notes: 'COUNTY RESTRICTED — Gregg County games are illegal. 3/21 Site visited — convenience store under new management. Interested, needs to speak with owner/boss first. ~20 mins from Melissa location. Hold pending county resolution.' },
      { name: 'Milton Ladimier', phone: '8327544111', email: null, address: '1000 Brazos St, Crockett, TX 75835', business_name: null, city: 'Crockett', state: 'TX', stage: 'lost', revenue_split: '50/50', num_games: 7, num_kiosks: 1, game_type: 'Games', notes: '3/27 No longer interested — stayed with current vendor. 3/25 Voted out due to health issues, paused. Lead from Mr. Webster Sanford (15% referral fee from 50/50 split per Rich). 3/10 Rich and AM visited — wanted 7 machines, 2 pool tables, 2 dartboards, jukebox.' },
      { name: 'Raj', phone: '7175036882', email: null, address: '2502 New Boston Rd, Texarkana, TX 75501', business_name: null, city: 'Texarkana', state: 'TX', stage: 'initial_contact', revenue_split: '40/60', num_games: null, num_kiosks: null, game_type: 'both', notes: "3/27 Called, sent to voicemail again — likely No Go. 3/22 F/U, last recalled he wanted to speak with business partner first. No update since 1/30." },
      { name: 'Angelic Sponaugle', phone: '2109473016', email: 'angelic8630@gmail.com', address: 'San Antonio, TX', business_name: null, city: 'San Antonio', state: 'TX', county: 'Bexar', stage: 'initial_contact', revenue_split: '60/40', num_games: 20, num_kiosks: 2, game_type: 'both', notes: 'Opening a game room in ~2 months. Floresville area. AK followed up 3/21 — they asked for 1 game, explained we need minimum 3 + kiosk. Offered 3 games + 1 kiosk. Needs help with marketing. Live Oak — May 1 target.' },
      { name: 'Jay', phone: '2103677652', email: 'jay21ps@yahoo.com', address: 'Waiting', business_name: null, city: null, state: 'TX', stage: 'initial_contact', num_games: 5, game_type: null, notes: 'Wants to buy 5 JVL games + 1 kiosk. Need to send pricing ASAP. Thinking of opening a game room. AK followed up 3/21 — waiting.' },
      { name: 'Daniel', phone: '9032612805', email: null, address: '2516 Hwy 42, Kilgore, TX', business_name: null, city: 'Kilgore', state: 'TX', county: 'Gregg', stage: 'prospect', revenue_split: '60/40', num_games: 4, num_kiosks: 1, game_type: 'Games', notes: 'COUNTY RESTRICTED — Gregg County. Opening 4 new spots in Oklahoma, will be busy for 3 months. Circling back when back in Texas. Need to mention online option.' },
      { name: 'Rick Montez', phone: '2104270823', email: 'rick.montez@tomatillos.com', address: 'Tomatillos Restaurant & Bar, 2611 SE Military Dr Suite 108, San Antonio, TX', business_name: 'Tomatillos Restaurant & Bar', city: 'San Antonio', state: 'TX', county: 'Bexar', stage: 'initial_contact', num_games: 5, num_kiosks: 1, game_type: 'Games', notes: "3/28 Called back, no answer — wife may have said no. 1/27 Didn't communicate with wife about the space. Shawn checked it out — it's good once they come to agreement." },
    ];

    for (const l of leads) {
      const exists = await pool.query(
        `SELECT id FROM leads WHERE name = $1 AND (phone = $2 OR (phone IS NULL AND $2 IS NULL))`,
        [l.name, l.phone || null]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO leads (name, phone, email, address, business_name, city, state, county, stage,
            revenue_split, num_games, num_kiosks, game_type, notes, follow_up_date, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [l.name, l.phone || null, l.email || null, l.address || null, l.business_name || null,
           l.city || null, l.state || 'TX', l.county || null, l.stage,
           l.revenue_split || null, l.num_games || null, l.num_kiosks || null,
           l.game_type || null, l.notes || null, l.follow_up_date || null, 'spreadsheet_import']
        );
      }
    }
    console.log(`Seeded ${leads.length} leads from spreadsheet import`);
  }

  console.log('Database initialized');
}

// Run init
initDatabase().catch(err => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});

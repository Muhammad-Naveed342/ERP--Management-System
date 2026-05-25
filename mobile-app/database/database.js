import * as SQLite from "expo-sqlite";

let dbInstance = null;
let initPromise = null;

export async function initDatabase() {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await SQLite.openDatabaseAsync("business_offline.db");

    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS shops (
        id INTEGER PRIMARY KEY,
        shop_name TEXT NOT NULL,
        location TEXT
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY,
        item_name TEXT NOT NULL,
        price REAL NOT NULL,
        company_id INTEGER,
        company_name TEXT,
        image_url TEXT,
        retail_price REAL,
        wholesale_price REAL,
        pieces_per_carton INTEGER NOT NULL DEFAULT 12,
        retail_price_carton REAL,
        wholesale_price_carton REAL
      );

      CREATE TABLE IF NOT EXISTS orders_local (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        unit_type TEXT NOT NULL DEFAULT 'piece',
        synced INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE TABLE IF NOT EXISTS sales_local (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        income_received REAL NOT NULL,
        loan REAL NOT NULL,
        total_price REAL NOT NULL,
        unit_type TEXT NOT NULL DEFAULT 'piece',
        synced INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_orders_local_user ON orders_local(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_local_user ON sales_local(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_local_sync ON orders_local(synced);
      CREATE INDEX IF NOT EXISTS idx_sales_local_sync ON sales_local(synced);
    `);

    // Safe upgrade: Add new columns if items table already exists from previous session
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN company_id INTEGER;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN company_name TEXT;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN image_url TEXT;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN retail_price REAL;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN wholesale_price REAL;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN pieces_per_carton INTEGER DEFAULT 12;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN retail_price_carton REAL;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE items ADD COLUMN wholesale_price_carton REAL;");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE orders_local ADD COLUMN unit_type TEXT DEFAULT 'piece';");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE sales_local ADD COLUMN unit_type TEXT DEFAULT 'piece';");
    } catch (e) { /* exists */ }
    try {
      await database.execAsync("ALTER TABLE shops ADD COLUMN location TEXT;");
    } catch (e) { /* exists */ }

    dbInstance = database;
    return database;
  })();

  return initPromise;
}

export async function applyBootstrap({ users, shops, items }) {
  const db = await initDatabase();
  
  // Disable foreign keys temporarily to allow refreshing master data 
  // without failing on existing local order/sale references.
  await db.execAsync("PRAGMA foreign_keys = OFF;");
  
  try {
    await db.runAsync("DELETE FROM users");
    for (const u of users || []) {
      await db.runAsync(
        `INSERT INTO users (id, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.username, u.hashed_password, u.role, u.is_active ? 1 : 0]
      );
    }
    
    await db.runAsync("DELETE FROM shops");
    for (const s of shops || []) {
      await db.runAsync(`INSERT INTO shops (id, shop_name, location) VALUES (?, ?, ?)`, [
        s.id,
        s.shop_name,
        s.location || null,
      ]);
    }
    
    await db.runAsync("DELETE FROM items");
    for (const i of items || []) {
      // Map tier pricing during bootstrap, fallback to i.price
      let retailPrice = i.price;
      let wholesalePrice = i.price;
      let retailPriceCarton = null;
      let wholesalePriceCarton = null;
      
      if (i.prices && Array.isArray(i.prices)) {
        const ret = i.prices.find((p) => p.price_type_code === 'retail' || p.price_type_id === 1);
        if (ret) retailPrice = ret.price;
        
        const who = i.prices.find((p) => p.price_type_code === 'wholesale' || p.price_type_id === 2);
        if (who) wholesalePrice = who.price;

        const retC = i.prices.find((p) => p.price_type_code === 'retail_carton' || p.price_type_id === 3);
        if (retC) retailPriceCarton = retC.price;

        const whoC = i.prices.find((p) => p.price_type_code === 'wholesale_carton' || p.price_type_id === 4);
        if (whoC) wholesalePriceCarton = whoC.price;
      }

      await db.runAsync(
        `INSERT INTO items (id, item_name, price, company_id, company_name, image_url, retail_price, wholesale_price, pieces_per_carton, retail_price_carton, wholesale_price_carton) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          i.id,
          i.item_name,
          i.price,
          i.company_id || null,
          i.company_name || null,
          i.image_url || null,
          retailPrice,
          wholesalePrice,
          i.pieces_per_carton || 12,
          retailPriceCarton,
          wholesalePriceCarton
        ]
      );
    }
  } finally {
    // Re-enable foreign keys
    await db.execAsync("PRAGMA foreign_keys = ON;");
  }
}

export async function getFieldUser(username) {
  const db = await initDatabase();
  return await db.getFirstAsync(`SELECT * FROM users WHERE username = ?`, [
    username.trim(),
  ]);
}

export async function listShops() {
  const db = await initDatabase();
  return await db.getAllAsync(
    `SELECT * FROM shops ORDER BY shop_name COLLATE NOCASE`
  );
}

export async function listCompanies() {
  const db = await initDatabase();
  return await db.getAllAsync(
    `SELECT DISTINCT company_id, company_name FROM items WHERE company_id IS NOT NULL ORDER BY company_name COLLATE NOCASE`
  );
}

export async function listItems(companyId = null, searchQuery = "") {
  const db = await initDatabase();
  let query = `SELECT * FROM items WHERE 1=1`;
  const params = [];
  
  if (companyId !== null) {
    query += ` AND company_id = ?`;
    params.push(companyId);
  }
  
  if (searchQuery && searchQuery.trim().length > 0) {
    query += ` AND item_name LIKE ?`;
    params.push(`%${searchQuery.trim()}%`);
  }
  
  query += ` ORDER BY item_name COLLATE NOCASE`;
  return await db.getAllAsync(query, params);
}

export async function insertLocalOrder({
  syncId,
  userId,
  shopId,
  itemId,
  quantity,
  unitPrice,
  totalPrice,
  unitType = "piece",
}) {
  const db = await initDatabase();
  const created = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO orders_local (sync_id, user_id, shop_id, item_id, quantity, unit_price, total_price, unit_type, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [syncId, userId, shopId, itemId, quantity, unitPrice, totalPrice, unitType, created]
  );
}

export async function listLocalOrders(userId) {
  const db = await initDatabase();
  return await db.getAllAsync(
    `SELECT o.*, s.shop_name, i.item_name, i.price AS current_unit_price
     FROM orders_local o
     JOIN shops s ON s.id = o.shop_id
     JOIN items i ON i.id = o.item_id
     WHERE o.user_id = ?
     ORDER BY o.local_id DESC`,
    [userId]
  );
}

export async function insertLocalSale({
  syncId,
  userId,
  shopId,
  itemId,
  quantity,
  incomeReceived,
  loan,
  totalPrice,
  unitType = "piece",
}) {
  const db = await initDatabase();
  const created = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sales_local (sync_id, user_id, shop_id, item_id, quantity, income_received, loan, total_price, unit_type, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      syncId,
      userId,
      shopId,
      itemId,
      quantity,
      incomeReceived,
      loan,
      totalPrice,
      unitType,
      created,
    ]
  );
}

export async function listLocalSales(userId) {
  const db = await initDatabase();
  return await db.getAllAsync(
    `SELECT s.*, sh.shop_name, i.item_name
     FROM sales_local s
     JOIN shops sh ON sh.id = s.shop_id
     JOIN items i ON i.id = s.item_id
     WHERE s.user_id = ?
     ORDER BY s.local_id DESC`,
    [userId]
  );
}

export async function getUnsyncedOrdersPayload(userId) {
  const db = await initDatabase();
  const rows = await db.getAllAsync(
    `SELECT shop_id, item_id, quantity, sync_id, unit_type, created_at FROM orders_local WHERE synced = 0 AND user_id = ?`,
    [userId]
  );
  return rows.map((r) => ({
    shop_id: r.shop_id,
    item_id: r.item_id,
    quantity: r.quantity,
    sync_id: r.sync_id,
    unit_type: r.unit_type || "piece",
    timestamp: r.created_at,
  }));
}

export async function getUnsyncedSalesPayload(userId) {
  const db = await initDatabase();
  const rows = await db.getAllAsync(
    `SELECT shop_id, item_id, quantity, income_received, loan, sync_id, unit_type, created_at FROM sales_local WHERE synced = 0 AND user_id = ?`,
    [userId]
  );
  return rows.map((r) => ({
    shop_id: r.shop_id,
    item_id: r.item_id,
    quantity: r.quantity,
    income_received: r.income_received,
    loan: r.loan,
    sync_id: r.sync_id,
    unit_type: r.unit_type || "piece",
    timestamp: r.created_at,
  }));
}

export async function markOrdersSynced(syncIds) {
  if (!syncIds?.length) return;
  const db = await initDatabase();
  const ph = syncIds.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE orders_local SET synced = 1 WHERE sync_id IN (${ph})`,
    syncIds
  );
}

export async function markSalesSynced(syncIds) {
  if (!syncIds?.length) return;
  const db = await initDatabase();
  const ph = syncIds.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE sales_local SET synced = 1 WHERE sync_id IN (${ph})`,
    syncIds
  );
}

export async function countMasterRows() {
  const db = await initDatabase();
  const u = await db.getFirstAsync(`SELECT COUNT(*) AS c FROM users`);
  const s = await db.getFirstAsync(`SELECT COUNT(*) AS c FROM shops`);
  const i = await db.getFirstAsync(`SELECT COUNT(*) AS c FROM items`);
  return {
    users: u?.c ?? 0,
    shops: s?.c ?? 0,
    items: i?.c ?? 0,
  };
}

export async function deleteLocalOrder(localId) {
  const db = await initDatabase();
  await db.runAsync(`DELETE FROM orders_local WHERE local_id = ?`, [localId]);
}

export async function deleteLocalSale(localId) {
  const db = await initDatabase();
  await db.runAsync(`DELETE FROM sales_local WHERE local_id = ?`, [localId]);
}

/* ============================================================
   DATA LAYER — localStorage CRUD + Seed Data
   ============================================================ */

const DB = {
  // ---- Supabase Configuration ----
  // Nilai dibaca dari js/config.js (setara .env untuk pure frontend).
  // Fallback ke string kosong jika config.js belum dimuat.
  SUPABASE_URL: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUPABASE_URL) || '',
  SUPABASE_KEY: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUPABASE_KEY) || '',
  remoteClient: null,

  initRemote() {
    // Re-baca APP_CONFIG saat dipanggil (defensive, jaga-jaga timing load)
    if (typeof APP_CONFIG !== 'undefined') {
      if (APP_CONFIG.SUPABASE_URL) this.SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
      if (APP_CONFIG.SUPABASE_KEY) this.SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;
    }

    // Coba global 'supabase' dan fallback ke window.supabase
    const sdkClient = (typeof supabase !== 'undefined' && supabase.createClient)
      ? supabase
      : (typeof window !== 'undefined' && window.supabase && window.supabase.createClient)
        ? window.supabase
        : null;

    if (!sdkClient) {
      console.warn('Supabase SDK belum dimuat (CDN mungkin gagal)');
      return;
    }
    if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
      console.warn('SUPABASE_URL atau SUPABASE_KEY kosong — periksa js/config.js');
      return;
    }
    try {
      this.remoteClient = sdkClient.createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
      console.log('Supabase client berhasil diinisialisasi');
    } catch (e) {
      console.error('Gagal membuat Supabase client:', e.message);
    }
  },

  async fetchRemoteData() {
    if (!this.remoteClient) return;
    const tables = ['users', 'doctors', 'products', 'transactions', 'pipeline', 'stock'];
    for (const table of tables) {
      const { data, error } = await this.remoteClient.from(table).select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        this.set(this.KEYS[table], data);
      }
    }
  },

  async syncRemoteTable(table, rows) {
    if (!this.remoteClient) return;
    const { error } = await this.remoteClient.from(table).upsert(rows, { onConflict: 'id' });
    if (error) console.warn('Supabase sync error', table, error);
  },

  async remoteInsert(table, row) {
    if (!this.remoteClient) return;
    const { error } = await this.remoteClient.from(table).insert(row);
    if (error) console.warn('Supabase insert error', table, error);
  },

  async remoteUpdate(table, id, updates) {
    if (!this.remoteClient) return;
    const { error } = await this.remoteClient.from(table).update(updates).eq('id', id);
    if (error) console.warn('Supabase update error', table, error);
  },

  async remoteDelete(table, id) {
    if (!this.remoteClient) return;
    const { error } = await this.remoteClient.from(table).delete().eq('id', id);
    if (error) console.warn('Supabase delete error', table, error);
  },

  async fetchUserByUsername(username) {
    if (!this.remoteClient) return null;
    // NOTE: password is fetched here only for login verification.
    // The caller (Auth.login) is responsible for stripping it before caching.
    const { data, error } = await this.remoteClient
      .from('users')
      .select('id,name,username,password,role,area,target,avatar')
      .eq('username', username)
      .limit(1)
      .single();
    if (error) {
      console.warn('Supabase fetch user error', error);
      return null;
    }
    return data || null;
  },

  async testConnection() {
    if (!this.remoteClient) return false;
    try {
      const { data, error } = await this.remoteClient.from('users').select('id').limit(1);
      if (error) {
        console.warn('Supabase test connection failed', error);
        return false;
      }
      return Array.isArray(data);
    } catch (e) {
      console.warn('Supabase test connection exception', e);
      return false;
    }
  },

  // Ekstrak project ref dari URL Supabase
  getProjectRef() {
    const match = (this.SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  },

  // Cek tabel mana yang sudah ada / belum di Supabase
  async checkRemoteTables() {
    const tables = ['users', 'doctors', 'products', 'transactions', 'pipeline', 'stock'];
    const result = {};
    for (const table of tables) {
      try {
        const { error } = await this.remoteClient.from(table).select('id').limit(1);
        // error code 42P01 = relation does not exist
        result[table] = !error || error.code !== '42P01';
      } catch {
        result[table] = false;
      }
    }
    return result; // { users: true, doctors: false, ... }
  },

  // SQL DDL untuk membuat semua tabel
  CREATE_TABLES_SQL: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      area TEXT,
      target BIGINT DEFAULT 0,
      avatar TEXT
    );
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT,
      clinic TEXT,
      area TEXT,
      "salesId" TEXT,
      stamps INTEGER DEFAULT 0,
      "totalPurchase" BIGINT DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name TEXT,
      category TEXT,
      "basePrice" BIGINT DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      "salesId" TEXT,
      "doctorId" TEXT,
      date TEXT,
      "createdAt" TEXT,
      items JSONB,
      "totalAmount" BIGINT DEFAULT 0,
      "stampGiven" INTEGER DEFAULT 0,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS pipeline (
      id TEXT PRIMARY KEY,
      "doctorName" TEXT,
      "clinicName" TEXT,
      "itemName" TEXT,
      "estimatedValue" BIGINT DEFAULT 0,
      status TEXT,
      notes TEXT,
      "salesId" TEXT,
      "createdAt" TEXT
    );
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      kode TEXT,
      nama TEXT,
      gudang TEXT,
      stok INTEGER DEFAULT 0,
      "stokMin" INTEGER DEFAULT 0,
      harga BIGINT DEFAULT 0,
      "hargaJual" BIGINT DEFAULT 0,
      diskon NUMERIC DEFAULT 0,
      satuan TEXT,
      kategori TEXT,
      pemasok TEXT,
      sumber JSONB,
      keterangan TEXT,
      "updatedAt" TEXT
    );
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
    ALTER TABLE products DISABLE ROW LEVEL SECURITY;
    ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE pipeline DISABLE ROW LEVEL SECURITY;
    ALTER TABLE stock DISABLE ROW LEVEL SECURITY;
  `,

  // Buat semua tabel via Supabase Management API menggunakan Personal Access Token
  async createTablesViaManagementAPI(accessToken) {
    const ref = this.getProjectRef();
    if (!ref) throw new Error('Project ref tidak ditemukan dari SUPABASE_URL');

    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: this.CREATE_TABLES_SQL }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }
    return true;
  },

  // Upsert all local tables to remote (useful for initial migration)
  async syncAllToRemote() {
    if (!this.remoteClient) return;
    const tables = ['users', 'doctors', 'products', 'transactions', 'pipeline', 'stock'];
    for (const table of tables) {
      try {
        const rows = this.get(this.KEYS[table]);
        if (Array.isArray(rows) && rows.length) {
          await this.syncRemoteTable(table, rows);
        }
      } catch (err) {
        console.warn('Supabase syncAll error', table, err);
      }
    }
  },

  // ---- Keys ----
  KEYS: {
    users: 'sm_users',
    doctors: 'sm_doctors',
    products: 'sm_products',
    transactions: 'sm_transactions',
    pipeline: 'sm_pipeline',
    stock: 'sm_stock',
  },

  // ---- Generic Get/Set ----
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // ---- Users ----
  getUsers() { return this.get(this.KEYS.users); },
  getUserById(id) { return this.getUsers().find(u => u.id === id) || null; },
  getUserByUsername(username) { return this.getUsers().find(u => u.username === username) || null; },
  updateUser(id, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      this.set(this.KEYS.users, users);
      this.remoteUpdate('users', id, updates);
    }
  },

  // ---- Doctors ----
  getDoctors() { return this.get(this.KEYS.doctors); },
  getDoctorById(id) { return this.getDoctors().find(d => d.id === id) || null; },
  getDoctorsByArea(area) { return this.getDoctors().filter(d => d.area === area); },
  addDoctor(doc) {
    const doctors = this.getDoctors();
    doctors.push(doc);
    this.set(this.KEYS.doctors, doctors);
    this.remoteInsert('doctors', doc);
  },
  updateDoctor(id, updates) {
    const docs = this.getDoctors();
    const idx = docs.findIndex(d => d.id === id);
    if (idx !== -1) {
      docs[idx] = { ...docs[idx], ...updates };
      this.set(this.KEYS.doctors, docs);
      this.remoteUpdate('doctors', id, updates);
    }
  },

  // ---- Products ----
  getProducts() { return this.get(this.KEYS.products); },
  getProductById(id) { return this.getProducts().find(p => p.id === id) || null; },

  // ---- Transactions ----
  getTransactions() { return this.get(this.KEYS.transactions); },
  getTransactionById(id) { return this.getTransactions().find(t => t.id === id) || null; },
  getTransactionsBySales(salesId) { return this.getTransactions().filter(t => t.salesId === salesId); },
  addTransaction(tx) {
    const list = this.getTransactions();
    list.unshift(tx);
    this.set(this.KEYS.transactions, list);
    this.remoteInsert('transactions', tx);
  },
  updateTransaction(id, updates) {
    const list = this.getTransactions();
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.set(this.KEYS.transactions, list);
      this.remoteUpdate('transactions', id, updates);
    }
  },
  deleteTransaction(id) {
    const list = this.getTransactions().filter(t => t.id !== id);
    this.set(this.KEYS.transactions, list);
    this.remoteDelete('transactions', id);
  },

  // ---- Pipeline Equipment ----
  getPipeline() { return this.get(this.KEYS.pipeline); },
  getPipelineById(id) { return this.getPipeline().find(p => p.id === id) || null; },
  getPipelineBySales(salesId) { return this.getPipeline().filter(p => p.salesId === salesId); },
  addPipeline(item) {
    const list = this.getPipeline();
    list.unshift(item);
    this.set(this.KEYS.pipeline, list);
    this.remoteInsert('pipeline', item);
  },
  updatePipeline(id, updates) {
    const list = this.getPipeline();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.set(this.KEYS.pipeline, list);
      this.remoteUpdate('pipeline', id, updates);
    }
  },
  deletePipeline(id) {
    const list = this.getPipeline().filter(p => p.id !== id);
    this.set(this.KEYS.pipeline, list);
    this.remoteDelete('pipeline', id);
  },

  // ---- Stock Gudang ----
  getStock()          { return this.get(this.KEYS.stock); },
  getStockById(id)    { return this.getStock().find(s => s.id === id) || null; },
  getStockByKode(k)   { return this.getStock().find(s => s.kode === k) || null; },
  addStock(item) {
    const list = this.getStock();
    list.push(item);
    this.set(this.KEYS.stock, list);
    this.remoteInsert('stock', item);
  },
  updateStock(id, updates) {
    const list = this.getStock();
    const idx  = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      const merged = { ...list[idx], ...updates, updatedAt: this.today() };
      list[idx] = merged;
      this.set(this.KEYS.stock, list);
      this.remoteUpdate('stock', id, { ...updates, updatedAt: this.today() });
    }
  },
  deleteStock(id) {
    this.set(this.KEYS.stock, this.getStock().filter(s => s.id !== id));
    this.remoteDelete('stock', id);
  },
  upsertStockByKode(row) {
    const existing = this.getStockByKode(row.kode);
    if (existing) { this.updateStock(existing.id, row); return 'updated'; }
    else { this.addStock({ id: this.genId(), ...row, updatedAt: this.today() }); return 'added'; }
  },

  // ── Bulk upsert: baca + tulis localStorage HANYA 1× (jauh lebih cepat) ──
  bulkUpsertStockByKodeGudang(rows) {
    const list = this.getStock();                       // baca 1×
    const today = this.today();
    let added = 0, updated = 0, skipped = 0;

    // Buat index kode|gudang → posisi array untuk O(1) lookup
    const idx = {};
    list.forEach((s, i) => {
      idx[(s.kode || '') + '|' + (s.gudang || '')] = i;
    });

    rows.forEach(row => {
      const kode   = (row.kode   || '').toString().trim();
      const gudang = (row.gudang || '').toString().trim();
      if (!kode) { skipped++; return; }

      const key = kode + '|' + gudang;
      const pos = idx[key];

      if (pos !== undefined) {
        const ex = list[pos];
        const prevSrc = Array.isArray(ex.sumber) ? ex.sumber : [ex.sumber || 'manual'];
        list[pos] = {
          ...ex,
          ...row,
          kategori:  row.kategori  || ex.kategori  || '',
          pemasok:   row.pemasok   || ex.pemasok   || '',
          satuan:    row.satuan    || ex.satuan    || 'Unit',
          sumber:    [...new Set([...prevSrc, row.sumber].filter(Boolean))],
          stokMin:   ex.stokMin || 0,
          harga:     ex.harga   || 0,
          keterangan: ex.keterangan || '',
          updatedAt: today,
        };
        updated++;
      } else {
        const newItem = {
          id: this.genId(),
          ...row,
          sumber:    [row.sumber].filter(Boolean),
          stokMin:   0,
          harga:     0,
          keterangan: '',
          updatedAt:  today,
        };
        list.push(newItem);
        idx[key] = list.length - 1;                    // update index
        added++;
      }
    });

    this.set(this.KEYS.stock, list);                   // tulis 1×
    // Sync semua baris ke Supabase secara asinkron (tidak memblokir UI)
    if (this.remoteClient) {
      this.syncRemoteTable('stock', list).catch(err => console.warn('Supabase bulk stock sync error', err));
    }
    return { added, updated, skipped };
  },

  // Upsert berdasarkan composite key Kode Barang + Nama Gudang
  // Merge data dari KBT/SBI/KDS: field kosong tidak menimpa data yang sudah ada
  upsertStockByKodeGudang(row) {
    // row: { kode, nama, gudang, stok, hargaJual, diskon, satuan, kategori, pemasok, sumber:'KBT'|'SBI'|'KDS' }
    const kode   = (row.kode   || '').toString().trim();
    const gudang = (row.gudang || '').toString().trim();
    if (!kode) return 'skipped';

    const list     = this.getStock();
    const existing = list.find(s => (s.kode || '').toString().trim() === kode && (s.gudang || '').toString().trim() === gudang);

    const prevSumber = existing ? (Array.isArray(existing.sumber) ? existing.sumber : [existing.sumber || 'manual']) : [];
    const newSumber  = [...new Set([...prevSumber, row.sumber].filter(Boolean))];

    const merged = {
      kode,
      nama:      row.nama      || (existing && existing.nama)      || '',
      gudang,
      stok:      row.stok      !== undefined ? row.stok      : (existing ? existing.stok      : 0),
      hargaJual: row.hargaJual !== undefined ? row.hargaJual : (existing ? (existing.hargaJual || 0) : 0),
      diskon:    row.diskon    !== undefined ? row.diskon    : (existing ? (existing.diskon    || 0) : 0),
      satuan:    row.satuan    || (existing && existing.satuan)    || 'Unit',
      kategori:  row.kategori  || (existing && existing.kategori)  || '',
      pemasok:   row.pemasok   || (existing && existing.pemasok)   || '',
      sumber:    newSumber,
      stokMin:   existing ? (existing.stokMin || 0) : 0,
      harga:     existing ? (existing.harga   || 0) : 0,
      keterangan: existing ? (existing.keterangan || '') : '',
      updatedAt: this.today(),
    };

    if (existing) {
      this.updateStock(existing.id, merged);
      return 'updated';
    } else {
      this.addStock({ id: this.genId(), ...merged });
      return 'added';
    }
  },

  // Seed stock data (terpisah dari seed utama)
  seedStock() {
    if (localStorage.getItem('sm_stock_seeded')) return;
    const stock = [
      { id: 'stk01', kode: 'ALK-001', nama: 'USG Portable SonoSite iViz',       kategori: 'Alat Diagnostik',  satuan: 'Unit', stok: 3,  stokMin: 2, harga: 85000000,  gudang: 'Gudang A', keterangan: '' },
      { id: 'stk02', kode: 'ALK-002', nama: 'ECG 12 Lead EDAN SE-1201',          kategori: 'Alat Diagnostik',  satuan: 'Unit', stok: 5,  stokMin: 3, harga: 32000000,  gudang: 'Gudang A', keterangan: '' },
      { id: 'stk03', kode: 'ALK-003', nama: 'Patient Monitor 5 Parameter',       kategori: 'Monitoring',       satuan: 'Unit', stok: 4,  stokMin: 2, harga: 28000000,  gudang: 'Gudang A', keterangan: '' },
      { id: 'stk04', kode: 'ALK-004', nama: 'Autoclave 23L Tuttnauer',           kategori: 'Sterilisasi',      satuan: 'Unit', stok: 2,  stokMin: 2, harga: 45000000,  gudang: 'Gudang B', keterangan: 'Stok kritis' },
      { id: 'stk05', kode: 'ALK-005', nama: 'Infusion Pump TERUMO TE-171',       kategori: 'Terapi Cairan',    satuan: 'Unit', stok: 8,  stokMin: 4, harga: 18000000,  gudang: 'Gudang A', keterangan: '' },
      { id: 'stk06', kode: 'ALK-006', nama: 'Syringe Pump TERUMO TE-331',        kategori: 'Terapi Cairan',    satuan: 'Unit', stok: 6,  stokMin: 3, harga: 22000000,  gudang: 'Gudang A', keterangan: '' },
      { id: 'stk07', kode: 'ALK-007', nama: 'Pulse Oximeter Nonin 9590',         kategori: 'Monitoring',       satuan: 'Unit', stok: 10, stokMin: 5, harga: 7200000,   gudang: 'Gudang B', keterangan: '' },
      { id: 'stk08', kode: 'ALK-008', nama: 'Nebulizer Omron NE-C801',           kategori: 'Terapi Pernapasan',satuan: 'Unit', stok: 12, stokMin: 5, harga: 5500000,   gudang: 'Gudang B', keterangan: '' },
      { id: 'stk09', kode: 'ALK-009', nama: 'Dental Unit Belmont',               kategori: 'Dental',           satuan: 'Unit', stok: 1,  stokMin: 1, harga: 120000000, gudang: 'Gudang A', keterangan: 'Pre-order' },
      { id: 'stk10', kode: 'ALK-010', nama: 'Laringoskop Video Karl Storz',      kategori: 'Bedah',            satuan: 'Unit', stok: 2,  stokMin: 1, harga: 95000000,  gudang: 'Gudang A', keterangan: '' },
      { id: 'stk11', kode: 'OBT-001', nama: 'Urine Analyzer Strip (box 100)',    kategori: 'Reagen & Strip',   satuan: 'Box',  stok: 20, stokMin: 10, harga: 480000,   gudang: 'Gudang B', keterangan: '' },
      { id: 'stk12', kode: 'OBT-002', nama: 'Blood Glucose Strip (box 50)',      kategori: 'Reagen & Strip',   satuan: 'Box',  stok: 35, stokMin: 15, harga: 320000,   gudang: 'Gudang B', keterangan: '' },
      { id: 'stk13', kode: 'OBT-003', nama: 'IV Catheter 18G (box 50)',          kategori: 'Disposable',       satuan: 'Box',  stok: 8,  stokMin: 10, harga: 350000,   gudang: 'Gudang B', keterangan: 'Stok kritis' },
      { id: 'stk14', kode: 'OBT-004', nama: 'Infus Set Terumo (box 50)',         kategori: 'Disposable',       satuan: 'Box',  stok: 15, stokMin: 10, harga: 275000,   gudang: 'Gudang B', keterangan: '' },
      { id: 'stk15', kode: 'OBT-005', nama: 'Spuit 10ml Terumo (box 100)',       kategori: 'Disposable',       satuan: 'Box',  stok: 25, stokMin: 20, harga: 195000,   gudang: 'Gudang B', keterangan: '' },
    ].map(s => ({ ...s, updatedAt: this.today() }));
    this.set(this.KEYS.stock, stock);
    localStorage.setItem('sm_stock_seeded', '1');
  },

  // ---- Helpers ----
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
  formatRupiah(num) {
    if (isNaN(num) || num === null) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  },
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  },
  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },
  today() { return new Date().toISOString().split('T')[0]; },
  isInPeriod(dateStr, period) {
    const d = new Date(dateStr);
    const now = new Date();
    if (period === 'daily') {
      return d.toDateString() === now.toDateString();
    } else if (period === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return d >= start;
    } else if (period === 'monthly') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  },

  // ---- Akun Default (selalu tersedia, tidak bergantung Supabase) ----
  SEED_VERSION: 'v5',
  seed() {
    // Reset localStorage lama jika versi berubah
    if (localStorage.getItem('sm_seeded') !== this.SEED_VERSION) {
      Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('sm_stock_seeded');
    }
    if (localStorage.getItem('sm_seeded') === this.SEED_VERSION) return;

    // ── AKUN DEFAULT ─────────────────────────────────────────
    // Kredensial ini selalu ada bahkan tanpa koneksi Supabase.
    // Update juga di: setup-database.sql (Bagian 4)
    const users = [
      { id: 'u_mgr1', name: 'Johan',         username: 'admin',   password: 'Admin@2026',  role: 'manager', area: 'All',     target: 0,        avatar: 'Jo' },
      { id: 'u_s1',   name: 'Ifan ',         username: 'ifan',    password: 'Sales@2026',  role: 'sales',   area: 'Jakarta', target: 50000000, avatar: 'I'  },
      { id: 'u_s2',   name: 'Cici',          username: 'cici',    password: 'Sales@2026',  role: 'sales',   area: 'Jakarta', target: 45000000, avatar: 'C'  },
      { id: 'u_s3',   name: 'Iqbal',         username: 'iqbal',   password: 'Sales@2026',  role: 'sales',   area: 'Jakarta', target: 40000000, avatar: 'Q'  },
      { id: 'u_s4',   name: 'Pirman',        username: 'pirman',  password: 'Sales@2026',  role: 'sales',   area: 'Jakarta', target: 42000000, avatar: 'P'  },
      { id: 'u_s5',   name: 'Nita',          username: 'nita',    password: 'Sales@2026',  role: 'sales',   area: 'Jakarta', target: 38000000, avatar: 'N'  },
      { id: 'u_s6',   name: 'Try',           username: 'try',     password: 'Sales@2026',  role: 'sales',   area: 'Medan',   target: 0,        avatar: 'T'  },
      { id: 'u_s7',   name: 'Agus',          username: 'agus',    password: 'Sales@2026',  role: 'sales',   area: 'Jakarta', target: 0,        avatar: 'A'  },
    ];

    this.set(this.KEYS.users, users);
    localStorage.setItem('sm_seeded', this.SEED_VERSION);
  },

  // Stock seed dinonaktifkan — data stok dikelola via Supabase / import Excel
  seedStock() { return; },
  // ---- Analytics ----
  getSalesTotalBySalesId(salesId, period = 'all') {
    return this.getTransactions()
      .filter(t => t.salesId === salesId && (period === 'all' || this.isInPeriod(t.date, period)))
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  },

  getLeaderboard() {
    const sales = this.getUsers().filter(u => u.role === 'sales');
    return sales.map(s => ({
      ...s,
      total: this.getSalesTotalBySalesId(s.id),
      txCount: this.getTransactionsBySales(s.id).length,
    })).sort((a, b) => b.total - a.total);
  },

  getBestProducts(period = 'monthly') {
    const txs = this.getTransactions().filter(t => period === 'all' || this.isInPeriod(t.date, period));
    const map = {};

    txs.forEach(tx => {
      if (!Array.isArray(tx.items)) return;

      tx.items.forEach(item => {
        const rawName    = (item.productName || '').trim();
        if (!rawName) return;

        const itemRevenue = (item.price || 0) * (1 - (item.discount || 0) / 100) * (item.qty || 1);
        const itemQty     = item.qty || 1;

        // Produk dari katalog (productId valid & bukan 'p16' generik)
        const isGeneric = !item.productId
          || item.productId === 'p16'
          || item.productId.startsWith('manual');

        if (!isGeneric) {
          // ── Produk katalog: gunakan productId sebagai key ──
          const prod = this.getProductById(item.productId);
          const key  = item.productId;
          if (!map[key]) {
            map[key] = {
              id: key,
              name: item.productName || (prod ? prod.name : key),
              category: prod ? prod.category : '-',
              qty: 0, revenue: 0,
            };
          }
          map[key].qty     += itemQty;
          map[key].revenue += itemRevenue;

        } else {
          // ── Input manual: pisahkan per koma → ranking individual ──
          const names = rawName.split(',').map(n => n.trim()).filter(Boolean);
          const share = 1 / names.length; // distribusi proporsional

          names.forEach(name => {
            const key = name.toLowerCase();
            const displayName = name.replace(/\b\w/g, c => c.toUpperCase());
            if (!map[key]) {
              const matched = this.getProducts().find(p =>
                p.name.toLowerCase() === key ||
                p.sku?.toLowerCase() === key
              );
              map[key] = {
                id: key,
                name: matched ? matched.name : displayName,
                category: matched ? matched.category : 'Dari Transaksi',
                qty: 0, revenue: 0,
              };
            }
            // qty = jumlah kemunculan (1 per transaksi, bukan dibagi)
            // Ini mencerminkan "berapa kali produk dipesan"
            map[key].qty     += 1;
            // Revenue tetap dibagi proporsional karena kita tidak tahu harga per item
            map[key].revenue += itemRevenue * share;
          });
        }
      });
    });

    return Object.values(map)
      .filter(p => p.revenue > 0 || p.qty > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  },
};

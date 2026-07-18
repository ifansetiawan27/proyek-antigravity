/* ============================================================
   DATA LAYER — localStorage CRUD + Seed Data
   ============================================================ */

const DB = {

  // ---- Keys ----
  KEYS: {
    users: 'sm_users',
    doctors: 'sm_doctors',
    products: 'sm_products',
    transactions: 'sm_transactions',
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
    if (idx !== -1) { users[idx] = { ...users[idx], ...updates }; this.set(this.KEYS.users, users); }
  },

  // ---- Doctors ----
  getDoctors() { return this.get(this.KEYS.doctors); },
  getDoctorById(id) { return this.getDoctors().find(d => d.id === id) || null; },
  getDoctorsByArea(area) { return this.getDoctors().filter(d => d.area === area); },
  updateDoctor(id, updates) {
    const docs = this.getDoctors();
    const idx = docs.findIndex(d => d.id === id);
    if (idx !== -1) { docs[idx] = { ...docs[idx], ...updates }; this.set(this.KEYS.doctors, docs); }
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
  },
  updateTransaction(id, updates) {
    const list = this.getTransactions();
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; this.set(this.KEYS.transactions, list); }
  },
  deleteTransaction(id) {
    const list = this.getTransactions().filter(t => t.id !== id);
    this.set(this.KEYS.transactions, list);
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

  // ---- Seed Data ----
  seed() {
    if (localStorage.getItem('sm_seeded')) return;

    // USERS
    const users = [
      { id: 'u_mgr1', name: 'Ahmad Fauzi', username: 'manager1', password: 'manager123', role: 'manager', area: 'All', target: 0, avatar: 'AF' },
      { id: 'u_s1', name: 'Budi Santoso', username: 'budi_s', password: 'sales123', role: 'sales', area: 'Jakarta Selatan', target: 50000000, avatar: 'BS' },
      { id: 'u_s2', name: 'Sari Wulandari', username: 'sari_w', password: 'sales123', role: 'sales', area: 'Jakarta Barat', target: 45000000, avatar: 'SW' },
      { id: 'u_s3', name: 'Rizky Pratama', username: 'rizky_p', password: 'sales123', role: 'sales', area: 'Tangerang', target: 40000000, avatar: 'RP' },
      { id: 'u_s4', name: 'Dewi Anggraini', username: 'dewi_a', password: 'sales123', role: 'sales', area: 'Bekasi', target: 42000000, avatar: 'DA' },
      { id: 'u_s5', name: 'Hendra Kurniawan', username: 'hendra_k', password: 'sales123', role: 'sales', area: 'Depok', target: 38000000, avatar: 'HK' },
    ];

    // DOCTORS
    const doctors = [
      { id: 'd1', name: 'dr. Andi Wijaya', clinic: 'Klinik Sehat Makmur', area: 'Jakarta Selatan', salesId: 'u_s1', stamps: 3, totalPurchase: 15200000 },
      { id: 'd2', name: 'dr. Budi Hartono', clinic: 'Praktek Mandiri', area: 'Jakarta Selatan', salesId: 'u_s1', stamps: 1, totalPurchase: 4500000 },
      { id: 'd3', name: 'dr. Citra Lestari', clinic: 'RS Cipto Medika', area: 'Jakarta Selatan', salesId: 'u_s1', stamps: 4, totalPurchase: 22000000 },
      { id: 'd4', name: 'dr. Dian Purnomo', clinic: 'Klinik Dian Medika', area: 'Jakarta Barat', salesId: 'u_s2', stamps: 2, totalPurchase: 8700000 },
      { id: 'd5', name: 'dr. Eka Saputra', clinic: 'Praktek Bersama Eka', area: 'Jakarta Barat', salesId: 'u_s2', stamps: 0, totalPurchase: 1200000 },
      { id: 'd6', name: 'dr. Fitri Maharani', clinic: 'Klinik Sejahtera', area: 'Tangerang', salesId: 'u_s3', stamps: 3, totalPurchase: 14000000 },
      { id: 'd7', name: 'dr. Guntur Wicaksono', clinic: 'Poliklinik Guntur', area: 'Tangerang', salesId: 'u_s3', stamps: 1, totalPurchase: 5500000 },
      { id: 'd8', name: 'dr. Hani Rahayu', clinic: 'RS Kartika', area: 'Bekasi', salesId: 'u_s4', stamps: 2, totalPurchase: 9800000 },
      { id: 'd9', name: 'dr. Irwan Susanto', clinic: 'Klinik 24 Jam Irwan', area: 'Bekasi', salesId: 'u_s4', stamps: 0, totalPurchase: 700000 },
      { id: 'd10', name: 'dr. Joko Widodo', clinic: 'Praktek Umum Joko', area: 'Depok', salesId: 'u_s5', stamps: 2, totalPurchase: 7500000 },
    ];

    // PRODUCTS
    const products = [
      { id: 'p1',  sku: 'INS-001', name: 'Stetoskop Pro Elite', category: 'Diagnostik', basePrice: 1200000 },
      { id: 'p2',  sku: 'INS-002', name: 'Tensimeter Digital Omron', category: 'Diagnostik', basePrice: 850000 },
      { id: 'p3',  sku: 'INS-003', name: 'Pulse Oximeter Advanced', category: 'Monitoring', basePrice: 650000 },
      { id: 'p4',  sku: 'INS-004', name: 'Termometer Infrared', category: 'Diagnostik', basePrice: 350000 },
      { id: 'p5',  sku: 'INS-005', name: 'Glucometer Smart Pro', category: 'Lab', basePrice: 980000 },
      { id: 'p6',  sku: 'INS-006', name: 'Nebulizer Mesh Ultra', category: 'Terapi', basePrice: 1450000 },
      { id: 'p7',  sku: 'INS-007', name: 'ECG Machine Portable', category: 'Kardio', basePrice: 8500000 },
      { id: 'p8',  sku: 'INS-008', name: 'Urine Analyzer Strip', category: 'Lab', basePrice: 480000 },
      { id: 'p9',  sku: 'INS-009', name: 'Otoskop Diagnostik', category: 'Diagnostik', basePrice: 720000 },
      { id: 'p10', sku: 'INS-010', name: 'Lampu Periksa Halogen', category: 'Periksa', basePrice: 550000 },
      { id: 'p11', sku: 'INS-011', name: 'Timbangan Medis Digital', category: 'Monitoring', basePrice: 1100000 },
      { id: 'p12', sku: 'INS-012', name: 'Spirometer Digital', category: 'Paru', basePrice: 3200000 },
      { id: 'p13', sku: 'INS-013', name: 'Refractometer Ophtalmo', category: 'Mata', basePrice: 4500000 },
      { id: 'p14', sku: 'INS-014', name: 'Alat Sterilisasi Autoklaf Meja', category: 'Sterilisasi', basePrice: 7800000 },
      { id: 'p15', sku: 'INS-015', name: 'Doppler Fetal Monitor', category: 'Kandungan', basePrice: 2200000 },
      { id: 'p16', sku: 'MED-001', name: 'Cairan Antiseptik 1L', category: 'Medis Habis Pakai', basePrice: 85000 },
      { id: 'p17', sku: 'MED-002', name: 'Sarung Tangan Steril (100pcs)', category: 'Medis Habis Pakai', basePrice: 250000 },
      { id: 'p18', sku: 'MED-003', name: 'Masker Medis N95 (50pcs)', category: 'Medis Habis Pakai', basePrice: 320000 },
      { id: 'p19', sku: 'MED-004', name: 'Jarum Suntik Disposable (100pcs)', category: 'Medis Habis Pakai', basePrice: 180000 },
      { id: 'p20', sku: 'MED-005', name: 'Strip Gula Darah (50 test)', category: 'Lab', basePrice: 210000 },
    ];

    // TRANSACTIONS — historical seed data
    const now = new Date();
    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d.toISOString().split('T')[0];
    };

    const transactions = [
      {
        id: DB.genId(), salesId: 'u_s1', doctorId: 'd1',
        date: daysAgo(0), createdAt: new Date().toISOString(),
        items: [
          { productId: 'p1', productName: 'Stetoskop Pro Elite', qty: 2, price: 1200000, discount: 0 },
          { productId: 'p2', productName: 'Tensimeter Digital Omron', qty: 1, price: 850000, discount: 0 },
        ],
        totalAmount: 3250000, stampGiven: 1,
        notes: 'Kunjungan rutin bulanan'
      },
      {
        id: DB.genId(), salesId: 'u_s1', doctorId: 'd3',
        date: daysAgo(1), createdAt: new Date(now - 86400000).toISOString(),
        items: [
          { productId: 'p6', productName: 'Nebulizer Mesh Ultra', qty: 3, price: 1450000, discount: 5 },
        ],
        totalAmount: 4132500, stampGiven: 1,
        notes: ''
      },
      {
        id: DB.genId(), salesId: 'u_s1', doctorId: 'd2',
        date: daysAgo(3), createdAt: new Date(now - 3 * 86400000).toISOString(),
        items: [
          { productId: 'p4', productName: 'Termometer Infrared', qty: 2, price: 350000, discount: 0 },
          { productId: 'p16', productName: 'Cairan Antiseptik 1L', qty: 10, price: 85000, discount: 0 },
        ],
        totalAmount: 1550000, stampGiven: 1,
        notes: 'Penawaran produk baru'
      },
      {
        id: DB.genId(), salesId: 'u_s1', doctorId: 'd1',
        date: daysAgo(7), createdAt: new Date(now - 7 * 86400000).toISOString(),
        items: [
          { productId: 'p7', productName: 'ECG Machine Portable', qty: 1, price: 8500000, discount: 10 },
        ],
        totalAmount: 7650000, stampGiven: 1,
        notes: 'Alat besar — negosiasi harga'
      },
      {
        id: DB.genId(), salesId: 'u_s1', doctorId: 'd3',
        date: daysAgo(12), createdAt: new Date(now - 12 * 86400000).toISOString(),
        items: [
          { productId: 'p5', productName: 'Glucometer Smart Pro', qty: 2, price: 980000, discount: 0 },
          { productId: 'p20', productName: 'Strip Gula Darah (50 test)', qty: 5, price: 210000, discount: 0 },
        ],
        totalAmount: 3010000, stampGiven: 1,
        notes: ''
      },
      // Sari Wulandari (u_s2)
      {
        id: DB.genId(), salesId: 'u_s2', doctorId: 'd4',
        date: daysAgo(1), createdAt: new Date(now - 86400000).toISOString(),
        items: [
          { productId: 'p1', productName: 'Stetoskop Pro Elite', qty: 1, price: 1200000, discount: 0 },
          { productId: 'p3', productName: 'Pulse Oximeter Advanced', qty: 2, price: 650000, discount: 0 },
        ],
        totalAmount: 2500000, stampGiven: 1,
        notes: ''
      },
      {
        id: DB.genId(), salesId: 'u_s2', doctorId: 'd5',
        date: daysAgo(4), createdAt: new Date(now - 4 * 86400000).toISOString(),
        items: [
          { productId: 'p17', productName: 'Sarung Tangan Steril (100pcs)', qty: 5, price: 250000, discount: 0 },
          { productId: 'p18', productName: 'Masker Medis N95 (50pcs)', qty: 4, price: 320000, discount: 0 },
        ],
        totalAmount: 2530000, stampGiven: 1,
        notes: ''
      },
      {
        id: DB.genId(), salesId: 'u_s2', doctorId: 'd4',
        date: daysAgo(15), createdAt: new Date(now - 15 * 86400000).toISOString(),
        items: [
          { productId: 'p11', productName: 'Timbangan Medis Digital', qty: 2, price: 1100000, discount: 0 },
        ],
        totalAmount: 2200000, stampGiven: 1,
        notes: ''
      },
      // Rizky Pratama (u_s3)
      {
        id: DB.genId(), salesId: 'u_s3', doctorId: 'd6',
        date: daysAgo(2), createdAt: new Date(now - 2 * 86400000).toISOString(),
        items: [
          { productId: 'p12', productName: 'Spirometer Digital', qty: 1, price: 3200000, discount: 5 },
          { productId: 'p9', productName: 'Otoskop Diagnostik', qty: 2, price: 720000, discount: 0 },
        ],
        totalAmount: 4480000, stampGiven: 1,
        notes: ''
      },
      {
        id: DB.genId(), salesId: 'u_s3', doctorId: 'd7',
        date: daysAgo(5), createdAt: new Date(now - 5 * 86400000).toISOString(),
        items: [
          { productId: 'p6', productName: 'Nebulizer Mesh Ultra', qty: 2, price: 1450000, discount: 0 },
        ],
        totalAmount: 2900000, stampGiven: 1,
        notes: ''
      },
      {
        id: DB.genId(), salesId: 'u_s3', doctorId: 'd6',
        date: daysAgo(20), createdAt: new Date(now - 20 * 86400000).toISOString(),
        items: [
          { productId: 'p15', productName: 'Doppler Fetal Monitor', qty: 1, price: 2200000, discount: 0 },
          { productId: 'p19', productName: 'Jarum Suntik Disposable (100pcs)', qty: 10, price: 180000, discount: 0 },
        ],
        totalAmount: 4000000, stampGiven: 1,
        notes: ''
      },
      // Dewi Anggraini (u_s4)
      {
        id: DB.genId(), salesId: 'u_s4', doctorId: 'd8',
        date: daysAgo(0), createdAt: new Date().toISOString(),
        items: [
          { productId: 'p14', productName: 'Alat Sterilisasi Autoklaf Meja', qty: 1, price: 7800000, discount: 8 },
        ],
        totalAmount: 7176000, stampGiven: 1,
        notes: 'Proyek besar klinik baru'
      },
      {
        id: DB.genId(), salesId: 'u_s4', doctorId: 'd9',
        date: daysAgo(6), createdAt: new Date(now - 6 * 86400000).toISOString(),
        items: [
          { productId: 'p2', productName: 'Tensimeter Digital Omron', qty: 2, price: 850000, discount: 0 },
          { productId: 'p4', productName: 'Termometer Infrared', qty: 3, price: 350000, discount: 0 },
        ],
        totalAmount: 2750000, stampGiven: 1,
        notes: ''
      },
      // Hendra Kurniawan (u_s5)
      {
        id: DB.genId(), salesId: 'u_s5', doctorId: 'd10',
        date: daysAgo(1), createdAt: new Date(now - 86400000).toISOString(),
        items: [
          { productId: 'p13', productName: 'Refractometer Ophtalmo', qty: 1, price: 4500000, discount: 0 },
          { productId: 'p10', productName: 'Lampu Periksa Halogen', qty: 2, price: 550000, discount: 0 },
        ],
        totalAmount: 5600000, stampGiven: 1,
        notes: ''
      },
      {
        id: DB.genId(), salesId: 'u_s5', doctorId: 'd10',
        date: daysAgo(8), createdAt: new Date(now - 8 * 86400000).toISOString(),
        items: [
          { productId: 'p8', productName: 'Urine Analyzer Strip', qty: 3, price: 480000, discount: 0 },
        ],
        totalAmount: 1440000, stampGiven: 0,
        notes: 'Di bawah minimum stamp'
      },
    ];

    this.set(this.KEYS.users, users);
    this.set(this.KEYS.doctors, doctors);
    this.set(this.KEYS.products, products);
    this.set(this.KEYS.transactions, transactions);
    localStorage.setItem('sm_seeded', '1');
  },

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
      tx.items.forEach(item => {
        if (!map[item.productId]) {
          const prod = this.getProductById(item.productId);
          map[item.productId] = {
            id: item.productId,
            name: item.productName || (prod ? prod.name : item.productId),
            category: prod ? prod.category : '-',
            qty: 0,
            revenue: 0,
          };
        }
        map[item.productId].qty += item.qty;
        const discountedPrice = item.price * (1 - (item.discount || 0) / 100);
        map[item.productId].revenue += discountedPrice * item.qty;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  },
};

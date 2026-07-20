/* ============================================================
   20 BEST PRODUCTS MODULE
   ============================================================ */

const Products = {
  _period: 'monthly',
  _sortBy: 'revenue',

  renderPage() {
    const products = DB.getBestProducts(this._period);

    return `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>📊 20 Best Products</h1>
          <p>Produk paling laku berdasarkan data seluruh tim sales</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div class="filter-tabs" id="period-tabs">
            <button class="filter-tab ${this._period==='daily'?'active':''}" onclick="Products.setPeriod('daily')">Harian</button>
            <button class="filter-tab ${this._period==='weekly'?'active':''}" onclick="Products.setPeriod('weekly')">Mingguan</button>
            <button class="filter-tab ${this._period==='monthly'?'active':''}" onclick="Products.setPeriod('monthly')">Bulanan</button>
          </div>
          <div class="filter-tabs" id="sort-tabs">
            <button class="filter-tab ${this._sortBy==='revenue'?'active':''}" onclick="Products.setSort('revenue')">Omset</button>
            <button class="filter-tab ${this._sortBy==='qty'?'active':''}" onclick="Products.setSort('qty')">Volume</button>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-grid" style="margin-bottom:24px;" id="product-stats">
        ${this.renderStats(products)}
      </div>

      <!-- Product List -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Ranking Produk</div>
            <div class="card-subtitle">Diurutkan berdasarkan ${this._sortBy === 'revenue' ? 'omset (Rupiah)' : 'volume penjualan (Qty)'} • ${this._period === 'daily' ? 'Hari Ini' : this._period === 'weekly' ? '7 Hari Terakhir' : 'Bulan Ini'}</div>
          </div>
        </div>
        <div id="product-list">
          ${this.renderList(products)}
        </div>
      </div>
    </div>`;
  },

  renderStats(products) {
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalQty = products.reduce((s, p) => s + p.qty, 0);
    const top1 = products[0];
    const categories = [...new Set(products.map(p => p.category))].length;

    return `
    <div class="stat-card primary">
      <div class="stat-icon primary">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div class="stat-value" style="font-size:18px;">${DB.formatRupiah(totalRevenue)}</div>
      <div class="stat-label">Total Omset (Top 20)</div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon success">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <div class="stat-value">${totalQty}</div>
      <div class="stat-label">Total Volume Terjual</div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
      <div class="stat-value" style="font-size:14px;">${top1 ? top1.name : '–'}</div>
      <div class="stat-label">Produk Terlaris #1</div>
    </div>
    <div class="stat-card info">
      <div class="stat-icon info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      </div>
      <div class="stat-value">${categories}</div>
      <div class="stat-label">Kategori Produk</div>
    </div>`;
  },

  renderList(products) {
    if (products.length === 0) {
      return `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <p>Tidak ada data produk untuk periode ini</p>
      </div>`;
    }

    const sorted = this._sortBy === 'revenue'
      ? [...products].sort((a, b) => b.revenue - a.revenue)
      : [...products].sort((a, b) => b.qty - a.qty);

    const maxVal = this._sortBy === 'revenue'
      ? Math.max(...sorted.map(p => p.revenue))
      : Math.max(...sorted.map(p => p.qty));

    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    const rankClass = ['gold', 'silver', 'bronze'];

    return `<div class="products-grid">
      ${sorted.map((prod, i) => {
        const val = this._sortBy === 'revenue' ? prod.revenue : prod.qty;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const rank = i + 1;
        const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        const numClass = rank <= 3 ? rankClass[rank - 1] : '';

        return `
        <div class="product-rank-item">
          <div class="rank-num ${numClass}">${medalEmoji || rank}</div>
          <div class="product-rank-bar">
            <div class="product-rank-name">${prod.name}</div>
            <div class="product-rank-cat">${prod.category}</div>
            <div class="product-rank-prog">
              <div class="product-rank-prog-fill" style="width:${pct}%;background:${rank===1?'linear-gradient(90deg,#f59e0b,#d97706)':rank===2?'linear-gradient(90deg,#94a3b8,#64748b)':rank===3?'linear-gradient(90deg,#cd7f32,#a05c20)':'var(--grad-primary)'}"></div>
            </div>
          </div>
          <div class="product-rank-val">
            <div class="product-rank-val-main">${this._sortBy === 'revenue' ? DB.formatRupiah(prod.revenue) : Math.round(prod.qty) + ' transaksi'}</div>
            <div class="product-rank-val-sub">${this._sortBy === 'revenue' ? Math.round(prod.qty) + ' transaksi' : DB.formatRupiah(prod.revenue)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  setPeriod(period) {
    this._period = period;
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = this.renderPage();
    // Animate bars
    setTimeout(() => {
      document.querySelectorAll('.product-rank-prog-fill').forEach(el => {
        el.style.transition = 'width 1s ease';
      });
    }, 50);
  },

  setSort(sortBy) {
    this._sortBy = sortBy;
    const products = DB.getBestProducts(this._period);
    const list = document.getElementById('product-list');
    if (list) list.innerHTML = this.renderList(products);
    // Update active tabs
    document.querySelectorAll('#sort-tabs .filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`#sort-tabs .filter-tab:${sortBy === 'revenue' ? 'first-child' : 'last-child'}`)?.classList.add('active');
  },
};

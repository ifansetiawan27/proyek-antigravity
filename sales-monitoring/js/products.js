/* ============================================================
   20 BEST PRODUCTS MODULE
   ============================================================ */

const Products = {
  _period: 'monthly',
  _sortBy: 'qty',

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
            <button class="filter-tab ${this._sortBy==='qty'?'active':''}" onclick="Products.setSort('qty')">Paling Laku</button>
            <button class="filter-tab ${this._sortBy==='revenue'?'active':''}" onclick="Products.setSort('revenue')">Omset Tertinggi</button>
          </div>
        </div>
      </div>

      <!-- Billboard: Kurva Popularitas Produk -->
      ${this.renderBillboard(products)}

      <!-- Product List -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Ranking Produk</div>
            <div class="card-subtitle">Diurutkan berdasarkan ${this._sortBy === 'qty' ? 'jumlah pesanan (paling laku)' : 'omset tertinggi (Rupiah)'} • ${this._period === 'daily' ? 'Hari Ini' : this._period === 'weekly' ? '7 Hari Terakhir' : 'Bulan Ini'} • Top ${Math.min(products.length, 20)}</div>
          </div>
        </div>
        <div id="product-list">
          ${this.renderList(products)}
        </div>
      </div>
    </div>`;
  },

  renderBillboard(products) {
    // Ambil top 15 berdasarkan qty (paling banyak dipesan)
    const data = [...products].sort((a, b) => b.qty - a.qty).slice(0, 15);

    if (data.length === 0) {
      return `<div class="card" style="padding:40px;text-align:center;margin-bottom:16px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:10px;opacity:0.3;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <p style="color:var(--text-muted);font-size:14px;">Belum ada data transaksi untuk grafik</p>
      </div>`;
    }

    const top        = data[0];
    const maxQty     = top.qty;
    const n          = data.length;
    const totalOrder = Math.round(data.reduce((s, d) => s + d.qty, 0));
    const periodLabel = this._period === 'daily' ? 'Hari Ini'
                      : this._period === 'weekly' ? '7 Hari Terakhir' : 'Bulan Ini';

    // ── SVG chart dimensions ──
    const W = 900, H = 300;
    const pad = { top: 36, right: 24, bottom: 72, left: 48 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;

    // ── Koordinat setiap titik ──
    const pts = data.map((d, i) => ({
      x: pad.left + (n > 1 ? (i / (n - 1)) * cW : cW / 2),
      y: pad.top  + cH - (d.qty / maxQty) * cH,
      d,
    }));

    // ── Smooth bezier curve ──
    let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p  = pts[i - 1];
      const c  = pts[i];
      const cx = ((p.x + c.x) / 2).toFixed(1);
      line += ` C ${cx} ${p.y.toFixed(1)} ${cx} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }
    const area = line
      + ` L ${pts[n-1].x.toFixed(1)} ${(pad.top + cH).toFixed(1)}`
      + ` L ${pts[0].x.toFixed(1)} ${(pad.top + cH).toFixed(1)} Z`;

    // ── Grid lines Y ──
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
      y: pad.top + cH - f * cH,
      v: Math.round(f * maxQty),
    }));
    const gridLines = yTicks.map(t =>
      `<line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${W - pad.right}" y2="${t.y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,3"/>
       <text x="${(pad.left - 6).toFixed(1)}" y="${(t.y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#94a3b8">${t.v}×</text>`
    ).join('');

    // ── Dots + nilai atas titik ──
    const dots = pts.map((pt, i) => {
      const isTop = i === 0;
      const clr   = isTop ? '#7c3aed' : '#a78bfa';
      const r     = isTop ? 6 : 4;
      const qty   = Math.round(pt.d.qty);
      return `
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${r}" fill="${clr}" stroke="white" stroke-width="2"/>
        <text x="${pt.x.toFixed(1)}" y="${(pt.y - r - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${clr}">${qty}×</text>`;
    }).join('');

    // ── Label X (nama produk, rotasi -38°) ──
    const xLabels = pts.map(pt => {
      const nm = pt.d.name.length > 15 ? pt.d.name.slice(0, 15) + '…' : pt.d.name;
      const bx = pt.x.toFixed(1);
      const by = (H - 6).toFixed(1);
      return `<text x="${bx}" y="${by}" text-anchor="end" font-size="9" fill="#64748b" transform="rotate(-38,${bx},${by})">${nm}</text>`;
    }).join('');

    return `
    <div class="card" style="margin-bottom:16px;overflow:hidden;">
      <!-- Header Billboard -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:18px 20px 10px;">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Kurva Popularitas Produk
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">
            Top ${n} produk — ${periodLabel} — total <strong>${totalOrder}×</strong> pesanan
          </div>
        </div>
        <!-- Highlight #1 -->
        <div style="background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(99,102,241,0.05));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:10px 16px;text-align:right;">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">🏆 Paling Banyak Dipesan</div>
          <div style="font-size:14px;font-weight:800;color:#7c3aed;">${top.name}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${Math.round(top.qty)}× dipesan · ${DB.formatRupiah(top.revenue)}</div>
        </div>
      </div>

      <!-- SVG Chart -->
      <div style="padding:0 8px 8px;">
        <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="billboardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stop-color="#7c3aed" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.01"/>
            </linearGradient>
          </defs>
          <!-- Grid -->
          ${gridLines}
          <!-- X axis -->
          <line x1="${pad.left}" y1="${pad.top + cH}" x2="${W - pad.right}" y2="${pad.top + cH}" stroke="#e2e8f0" stroke-width="1"/>
          <!-- Area fill -->
          <path d="${area}" fill="url(#billboardGrad)"/>
          <!-- Curve line -->
          <path d="${line}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stop-color="#7c3aed"/>
              <stop offset="100%" stop-color="#6366f1"/>
            </linearGradient>
          </defs>
          <!-- Dots + nilai -->
          ${dots}
          <!-- X labels -->
          ${xLabels}
        </svg>
      </div>
    </div>`;
  },

  renderStats(products) {
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    // Gunakan Math.round untuk hindari floating point imprecision (misal 11.0000000000001)
    const totalQty = Math.round(products.reduce((s, p) => s + p.qty, 0));
    // Produk terlaris = paling banyak dipesan (qty tertinggi)
    const top1 = [...products].sort((a, b) => b.qty - a.qty)[0];
    const categories = [...new Set(products.map(p => p.category).filter(c => c && c !== '-' && c !== 'Dari Transaksi'))];
    const catCount = categories.length || products.length > 0 ? products.length : 0;

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
      <div class="stat-label">Total Pesanan</div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon warning">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
      <div class="stat-value" style="font-size:14px;">${top1 ? top1.name : '–'}</div>
      <div class="stat-label">Paling Banyak Dipesan</div>
    </div>
    <div class="stat-card info">
      <div class="stat-icon info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      </div>
      <div class="stat-value">${products.length}</div>
      <div class="stat-label">Produk Unik</div>
    </div>`;
  },

  renderList(products) {
    if (products.length === 0) {
      return `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <p>Tidak ada data produk untuk periode ini</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Input transaksi terlebih dahulu agar produk muncul di sini</p>
      </div>`;
    }

    const sorted = this._sortBy === 'revenue'
      ? [...products].sort((a, b) => b.revenue - a.revenue)
      : [...products].sort((a, b) => b.qty - a.qty);

    const maxVal = this._sortBy === 'revenue'
      ? Math.max(...sorted.map(p => p.revenue))
      : Math.max(...sorted.map(p => p.qty));

    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    const rankClass    = ['gold', 'silver', 'bronze'];
    const barColors    = [
      'linear-gradient(90deg,#f59e0b,#d97706)',
      'linear-gradient(90deg,#94a3b8,#64748b)',
      'linear-gradient(90deg,#cd7f32,#a05c20)',
    ];

    const infoBar = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
      padding:10px 14px;background:var(--bg-input);border-radius:var(--radius-md);margin-bottom:12px;font-size:12px;color:var(--text-muted);">
      <span>Menampilkan <strong style="color:var(--text-primary);">${sorted.length}</strong> produk unik</span>
      <span>Total omset: <strong style="color:var(--primary-light);">${DB.formatRupiah(totalRevenue)}</strong></span>
    </div>`;

    const rows = sorted.map((prod, i) => {
      const val     = this._sortBy === 'revenue' ? prod.revenue : prod.qty;
      const pct     = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
      const pctRev  = totalRevenue > 0 ? ((prod.revenue / totalRevenue) * 100).toFixed(1) : 0;
      const rank    = i + 1;
      const medal   = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
      const cls     = rank <= 3 ? rankClass[rank - 1] : '';
      const barClr  = rank <= 3 ? barColors[rank - 1] : 'var(--grad-primary)';
      const txCount = Math.round(prod.qty);
      const catLabel = prod.category && prod.category !== '-' ? prod.category : '';

      return `
      <div class="product-rank-item">
        <div class="rank-num ${cls}">${medal || rank}</div>
        <div class="product-rank-bar">
          <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
            <div class="product-rank-name">${prod.name}</div>
            ${catLabel ? `<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:var(--bg-input);color:var(--text-muted);border:1px solid var(--border-subtle);">${catLabel}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
            <span style="font-size:11px;color:var(--text-muted);">${txCount}× dipesan</span>
            <span style="font-size:11px;color:var(--text-muted);">·</span>
            <span style="font-size:11px;color:var(--primary-light);font-weight:600;">${pctRev}% omset</span>
          </div>
          <div class="product-rank-prog" style="margin-top:6px;">
            <div class="product-rank-prog-fill" style="width:${pct}%;background:${barClr};"></div>
          </div>
        </div>
        <div class="product-rank-val">
          <div class="product-rank-val-main">${this._sortBy === 'revenue' ? DB.formatRupiah(prod.revenue) : txCount + '× dipesan'}</div>
            <div class="product-rank-val-sub">${this._sortBy === 'revenue' ? txCount + '× dipesan' : DB.formatRupiah(prod.revenue)}</div>
        </div>
      </div>`;
    }).join('');

    return `<div class="products-grid">${infoBar}${rows}</div>`;
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
    // Urutan tombol: first = "Paling Laku" (qty), last = "Omset Tertinggi" (revenue)
    document.querySelector(`#sort-tabs .filter-tab:${sortBy === 'qty' ? 'first-child' : 'last-child'}`)?.classList.add('active');
  },
};

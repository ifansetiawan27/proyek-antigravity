/* ============================================================
   APP — SPA Router, Navigation, Toast, Modal
   ============================================================ */

const App = {
  currentPage: null,

  async init() {
    DB.initRemote();
    DB.seed();      // load akun default ke localStorage (selalu berjalan)
    DB.seedStock(); // no-op (stock dikelola via Supabase/Excel)
    if (DB.remoteClient) {
      DB.fetchRemoteData().catch(err => console.warn('Supabase load failed', err));
      // Cek tabel setelah 2 detik (beri waktu koneksi stabil)
      setTimeout(() => this.checkAndShowDbSetupBanner(), 2000);
    }
    // Start clock
    this.startClock();
    // Hook Supabase test/sync buttons with loading states
    const testBtn = document.getElementById('btn-test-supabase');
    const syncBtn = document.getElementById('btn-sync-supabase');
    const setBtnLoading = (btn, loading, label) => {
      if (!btn) return;
      if (loading) {
        btn.dataset.orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.12);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:middle"></span>${label}`;
      } else {
        btn.disabled = false;
        if (btn.dataset.orig) {
          btn.innerHTML = btn.dataset.orig;
          delete btn.dataset.orig;
        }
      }
    };

    if (testBtn) testBtn.addEventListener('click', async () => {
      setBtnLoading(testBtn, true, 'Testing...');
      App.Toast.show('Menguji koneksi Supabase...', 'info');
      try {
        const ok = await DB.testConnection();
        if (ok) App.Toast.show('Supabase terhubung ✓', 'success');
        else App.Toast.show('Tidak dapat terhubung ke Supabase', 'error');
      } catch (e) {
        App.Toast.show('Kesalahan saat menguji koneksi', 'error');
        console.warn(e);
      } finally {
        setBtnLoading(testBtn, false);
      }
    });

    if (syncBtn) syncBtn.addEventListener('click', async () => {
      const confirmSync = confirm('Sinkronisasi akan mengirim data lokal ke Supabase. Lanjutkan?');
      if (!confirmSync) return;
      setBtnLoading(syncBtn, true, 'Syncing...');
      App.Toast.show('Menyinkronkan data ke Supabase...', 'info');
      try {
        await DB.syncAllToRemote();
        App.Toast.show('Sinkronisasi selesai', 'success');
      } catch (e) {
        App.Toast.show('Sinkronisasi gagal', 'error');
        console.warn(e);
      } finally {
        setBtnLoading(syncBtn, false);
      }
    });

    const mobilePreviewBtn = document.getElementById('btn-mobile-preview');
    if (mobilePreviewBtn) {
      mobilePreviewBtn.addEventListener('click', () => {
        const isEnabled = document.body.classList.toggle('mobile-preview');
        mobilePreviewBtn.textContent = isEnabled ? 'Exit Mobile' : 'Mobile Preview';
      });
    }
    // Check session
    if (!Auth.checkSession()) {
      document.getElementById('login-page').classList.remove('hidden');
    }
    // Keyboard: ESC closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  // Cek tabel Supabase dan tampilkan banner jika ada yang belum dibuat
  async checkAndShowDbSetupBanner() {
    if (!DB.remoteClient) return;
    try {
      const status = await DB.checkRemoteTables();
      const missing = Object.entries(status).filter(([, ok]) => !ok).map(([t]) => t);
      if (missing.length === 0) return; // semua tabel sudah ada

      // Tampilkan banner peringatan di atas konten
      const existing = document.getElementById('db-setup-banner');
      if (existing) return; // sudah ditampilkan

      const banner = document.createElement('div');
      banner.id = 'db-setup-banner';
      banner.style.cssText = [
        'position:fixed;bottom:20px;right:20px;z-index:9999;',
        'background:linear-gradient(135deg,#1e1030,#16103a);',
        'border:1px solid rgba(139,92,246,0.4);',
        'border-radius:14px;padding:16px 20px;max-width:360px;',
        'box-shadow:0 8px 32px rgba(0,0,0,0.5);',
        'animation:slideInUp 0.4s ease;',
      ].join('');
      banner.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(139,92,246,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Tabel Supabase Belum Dibuat</div>
            <div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:12px;">
              ${missing.length} tabel belum ada: <strong style="color:#c4b5fd;">${missing.join(', ')}</strong>.
              Data tidak akan tersimpan ke cloud.
            </div>
            <div style="display:flex;gap:8px;">
              <a href="setup-db.html" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:8px;font-size:12px;font-weight:600;color:white;text-decoration:none;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                Setup Database
              </a>
              <button onclick="document.getElementById('db-setup-banner').remove()" style="padding:7px 12px;background:transparent;border:1px solid rgba(148,163,184,0.2);border-radius:8px;font-size:12px;color:#64748b;cursor:pointer;">
                Nanti
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(banner);

      // Tambahkan animasi slideInUp jika belum ada
      if (!document.getElementById('setup-banner-style')) {
        const s = document.createElement('style');
        s.id = 'setup-banner-style';
        s.textContent = '@keyframes slideInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(s);
      }
    } catch (e) {
      console.warn('DB setup check error', e);
    }
  },

  navigate(page) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    // Guard manager-only pages
    if (page === 'manager' && user.role !== 'manager') {
      this.Toast.show('Akses ditolak', 'error');
      return;
    }

    this.currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Update page title
    const titles = {
      dashboard: 'Dashboard',
      appsheet: 'Appsheet v.7',
      transactions: 'Transaksi',
      loyalty: 'Loyalty Program',
      products: '20 Best Products',
      leaderboard: 'Leaderboard',
      reports: 'Reports',
      manager: 'Panel Manager',
    };
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = titles[page] || page;

    // Render page content
    const content = document.getElementById('page-content');
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;"><div class="loading-spinner"></div></div>';

    setTimeout(() => {
      let html = '';
      switch (page) {
        case 'dashboard':   html = this.renderDashboard(user); break;
        case 'appsheet':    html = this.renderAppsheet(); break;
        case 'transactions': html = Transactions.renderPage(); break;
        case 'loyalty':     html = Loyalty.renderPage(); break;
        case 'products':    html = Products.renderPage(); break;
        case 'leaderboard': html = Leaderboard.renderPage(); break;
        case 'reports':     html = Reports.renderPage(); break;
        case 'manager':     html = Manager.renderPage(); break;
        default:            html = '<p>Halaman tidak ditemukan</p>';
      }
      content.innerHTML = html;
    }, 50);
  },

  renderDashboard(user) {
    const isManager = user.role === 'manager';

    if (isManager) {
      return this.renderManagerDashboard(user);
    } else {
      return this.renderSalesDashboard(user);
    }
  },

  // Sumber badge config
  SUMBER_CFG: {
    KBT:    { color: '#d97706', bg: 'rgba(217,119,6,0.12)',   border: 'rgba(217,119,6,0.3)'   },
    SBI:    { color: '#2563eb', bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.3)'   },
    KDS:    { color: '#16a34a', bg: 'rgba(22,163,74,0.10)',   border: 'rgba(22,163,74,0.3)'   },
    manual: { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
  },

  renderSumberBadges(sumber) {
    const srcs = Array.isArray(sumber) ? sumber : [sumber || 'manual'];
    return srcs.filter(Boolean).map(s => {
      const c = this.SUMBER_CFG[s] || this.SUMBER_CFG.manual;
      return `<span style="display:inline-block;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;color:${c.color};background:${c.bg};border:1px solid ${c.border};margin:1px 2px 1px 0;">${s}</span>`;
    }).join('');
  },

  STOCK_PAGE_SIZE: 50,
  _stockFilter: { search: '', kategori: 'all', gudang: 'all', sumber: 'all', page: 0 },
  _stockViewMode: 'table', // 'table' | 'card'
  _searchDebounce: null,

  // ── Hitung filter sekali, digunakan oleh renderAppsheet & _renderStockResults ──
  _getFilteredStock() {
    const stock = DB.getStock();
    const _f    = this._stockFilter;
    let filtered = stock;
    if (_f.kategori !== 'all') filtered = filtered.filter(s => s.kategori === _f.kategori);
    if (_f.gudang   !== 'all') filtered = filtered.filter(s => s.gudang   === _f.gudang);
    if (_f.sumber   !== 'all') {
      filtered = filtered.filter(s => {
        const srcs = Array.isArray(s.sumber) ? s.sumber : [s.sumber || 'manual'];
        return srcs.includes(_f.sumber);
      });
    }
    if (_f.search) {
      const q = _f.search.toLowerCase();
      filtered = filtered.filter(s =>
        (s.kode   || '').toLowerCase().includes(q) ||
        (s.nama   || '').toLowerCase().includes(q) ||
        (s.pemasok|| '').toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
    return { stock, filtered };
  },

  // ── Hanya re-render bagian tabel + pagination (jauh lebih cepat) ──
  _renderStockResults() {
    const { stock, filtered } = this._getFilteredStock();
    const _f   = this._stockFilter;
    const PAGE = this.STOCK_PAGE_SIZE;
    const page = _f.page || 0;

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
    const safePage   = Math.min(page, totalPages - 1);
    const pageSlice  = filtered.slice(safePage * PAGE, (safePage + 1) * PAGE);
    const from       = filtered.length === 0 ? 0 : safePage * PAGE + 1;
    const to         = Math.min((safePage + 1) * PAGE, filtered.length);
    const isCard     = this._stockViewMode === 'card';

    // ── Baris tabel (desktop) ──
    const tableRows = pageSlice.map(item => {
      const isLow  = item.stok > 0 && item.stokMin > 0 && item.stok <= item.stokMin;
      const hJual  = item.hargaJual || 0;
      const diskon = item.diskon !== undefined && item.diskon !== '' ? item.diskon : '–';
      return `<tr>
        <td style="font-size:11px;font-weight:700;color:var(--primary);white-space:nowrap;">${item.kode}</td>
        <td style="max-width:240px;"><div style="font-size:12px;font-weight:600;word-break:break-word;">${item.nama}</div></td>
        <td style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${item.gudang || '–'}</td>
        <td style="text-align:center;">
          <span style="font-size:13px;font-weight:800;color:${isLow ? '#dc2626' : 'var(--success)'};">${item.stok ?? '–'}</span>
          ${isLow ? `<div style="font-size:9px;color:#dc2626;font-weight:700;">⚠ Kritis</div>` : ''}
        </td>
        <td style="font-size:12px;font-weight:600;white-space:nowrap;">${hJual ? DB.formatRupiah(hJual) : '–'}</td>
        <td style="font-size:12px;text-align:center;color:var(--text-secondary);">${diskon !== '–' ? diskon + '%' : '–'}</td>
        <td style="font-size:11px;color:var(--text-muted);">${item.kategori || '–'}</td>
        <td style="font-size:11px;color:var(--text-muted);max-width:150px;word-break:break-word;">${item.pemasok || '–'}</td>
        <td>${this.renderSumberBadges(item.sumber)}</td>
        <td></td>
      </tr>`;
    }).join('');

    // ── Kartu mobile ──
    const mobileCards = pageSlice.map(item => {
      const isLow = item.stok > 0 && item.stokMin > 0 && item.stok <= item.stokMin;
      const hJual = item.hargaJual || 0;
      return `
      <div class="stock-mobile-card ${isLow ? 'stock-mobile-card--low' : ''}">
        <div class="smc-header">
          <span class="smc-kode">${item.kode || '–'}</span>
          <div style="display:flex;gap:4px;align-items:center;">
            ${this.renderSumberBadges(item.sumber)}
          </div>
        </div>
        <div class="smc-nama">${item.nama}</div>
        <div class="smc-row">
          <span class="smc-lbl">Gudang</span>
          <span class="smc-val">${item.gudang || '–'}</span>
        </div>
        <div class="smc-row">
          <span class="smc-lbl">Qty</span>
          <span class="smc-val ${isLow ? 'smc-kritis' : ''}">${item.stok ?? '–'} ${item.satuan || ''} ${isLow ? '⚠' : ''}</span>
        </div>
        <div class="smc-row">
          <span class="smc-lbl">Hrg Jual</span>
          <span class="smc-val smc-harga">${hJual ? DB.formatRupiah(hJual) : '–'}</span>
        </div>
        ${item.kategori ? `<div class="smc-row"><span class="smc-lbl">Kategori</span><span class="smc-val">${item.kategori}</span></div>` : ''}
        ${item.pemasok  ? `<div class="smc-row"><span class="smc-lbl">Pemasok</span><span class="smc-val" style="font-size:11px;">${item.pemasok}</span></div>` : ''}
      </div>`;
    }).join('');

    const emptyState = `<div style="text-align:center;padding:48px 20px;color:var(--text-muted);">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:0.4;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <div style="font-size:14px;font-weight:600;">Tidak ada data ditemukan</div>
      <div style="font-size:12px;margin-top:4px;">Coba ubah filter atau kata kunci pencarian</div>
    </div>`;

    // ── Pagination ──
    const paginationBtns = totalPages <= 1 ? '' : (() => {
      let btns = '';
      const maxShow = 5;
      let start = Math.max(0, safePage - 2);
      let end   = Math.min(totalPages - 1, start + maxShow - 1);
      if (end - start < maxShow - 1) start = Math.max(0, end - maxShow + 1);
      btns += `<button class="btn btn-ghost btn-sm" ${safePage===0?'disabled':''} onclick="App.filterStock('page',${safePage-1})" style="padding:4px 10px;">‹</button>`;
      for (let i = start; i <= end; i++) {
        btns += `<button class="btn btn-sm ${i===safePage?'btn-primary':'btn-ghost'}" onclick="App.filterStock('page',${i})" style="padding:4px 10px;min-width:34px;">${i+1}</button>`;
      }
      btns += `<button class="btn btn-ghost btn-sm" ${safePage>=totalPages-1?'disabled':''} onclick="App.filterStock('page',${safePage+1})" style="padding:4px 10px;">›</button>`;
      return btns;
    })();

    return `
      <!-- Filter info + View toggle -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
        <span id="stock-count-badge" style="font-size:12px;color:var(--text-muted);">
          <strong>${filtered.length}</strong> dari <strong>${stock.length}</strong> item
        </span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button onclick="App.toggleStockView('table')" class="btn btn-sm ${!isCard?'btn-primary':'btn-ghost'}" title="Tampilan Tabel" style="padding:5px 10px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
            <span class="stock-view-label">Tabel</span>
          </button>
          <button onclick="App.toggleStockView('card')" class="btn btn-sm ${isCard?'btn-primary':'btn-ghost'}" title="Tampilan Kartu (Mobile)" style="padding:5px 10px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span class="stock-view-label">Kartu</span>
          </button>
        </div>
      </div>

      <!-- Tabel (desktop/table mode) -->
      <div class="card stock-view-table ${isCard?'stock-hidden-on-card':''}" style="padding:0;overflow:hidden;">
        <div class="table-wrapper">
          <table class="table" id="stock-table">
            <thead><tr>
              <th>Kode Barang</th><th>Nama Barang</th><th>Nama Gudang</th>
              <th style="text-align:center;">Qty</th><th>Hrg Jual</th>
              <th style="text-align:center;">Diskon</th><th>Kategori</th>
              <th>Pemasok</th><th>Sumber</th><th style="width:40px;"></th>
            </tr></thead>
            <tbody>${pageSlice.length > 0 ? tableRows : `<tr><td colspan="10">${emptyState}</td></tr>`}</tbody>
          </table>
        </div>
        <div class="stock-footer">
          <span style="font-size:12px;color:var(--text-muted);">
            Menampilkan <strong>${from}–${to}</strong> dari <strong>${filtered.length}</strong> hasil
          </span>
          <div style="display:flex;gap:4px;">${paginationBtns}</div>
        </div>
      </div>

      <!-- Kartu (mobile/card mode) -->
      <div class="stock-view-cards ${!isCard?'stock-hidden-on-table':''}">
        ${pageSlice.length > 0 ? mobileCards : emptyState}
        ${paginationBtns ? `<div style="display:flex;gap:4px;justify-content:center;padding:12px 0;">${paginationBtns}</div>` : ''}
      </div>`;
  },

  toggleStockView(mode) {
    this._stockViewMode = mode;
    const area = document.getElementById('stock-results-area');
    if (area) area.innerHTML = this._renderStockResults();
  },

  // ── Filter + debounce untuk search ──
  filterStock(key, value) {
    if (!this._stockFilter) this._stockFilter = { search:'', kategori:'all', gudang:'all', sumber:'all', page:0 };
    this._stockFilter[key] = key === 'page' ? Number(value) : value;
    if (key !== 'page') this._stockFilter.page = 0;

    const apply = () => {
      const area = document.getElementById('stock-results-area');
      if (area) {
        area.innerHTML = this._renderStockResults();
      } else {
        const content = document.getElementById('page-content');
        if (content) content.innerHTML = this.renderAppsheet();
      }
      if (key === 'search') {
        const el = document.getElementById('stock-search');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }
    };

    if (key === 'search') {
      // Debounce: tunda 250ms, cegah re-render tiap ketukan
      clearTimeout(this._searchDebounce);
      this._searchDebounce = setTimeout(apply, 250);
    } else {
      apply();
    }
  },

  renderAppsheet() {
    const isManager  = Auth.isManager();
    const stock      = DB.getStock();
    const lowStock   = stock.filter(s => s.stok > 0 && s.stokMin > 0 && s.stok <= s.stokMin);
    const totalNilai = stock.reduce((s, i) => s + ((i.stok || 0) * (i.hargaJual || i.harga || 0)), 0);
    const kategoriList = [...new Set(stock.map(s => s.kategori).filter(Boolean))].sort();
    const gudangList   = [...new Set(stock.map(s => s.gudang).filter(Boolean))].sort();
    const sumberList   = ['KBT','SBI','KDS','manual'];
    const _f           = this._stockFilter;
    const importIcon   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

    return `
    <div class="fade-in">
      <!-- Header -->
      <div class="appsheet-header">
        <div class="page-header-left">
          <h1 style="font-size:22px;font-weight:800;">Appsheet v.7</h1>
          <p style="color:var(--text-muted);font-size:13px;margin-top:3px;">Penggabungan database stock dari KBT · SBI · KDS</p>
        </div>
        <div class="appsheet-actions">
          ${isManager ? `
          <div class="appsheet-import-group">
            <label class="stock-import-btn" style="border-right:1px solid var(--border);" title="Import KBT">
              ${importIcon} KBT
              <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="App.importStockExcel(this,'KBT')" />
            </label>
            <label class="stock-import-btn" style="border-right:1px solid var(--border);" title="Import SBI">
              ${importIcon} SBI
              <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="App.importStockExcel(this,'SBI')" />
            </label>
            <label class="stock-import-btn" title="Import KDS">
              ${importIcon} KDS
              <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="App.importStockExcel(this,'KDS')" />
            </label>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.exportStockExcel()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="appsheet-btn-label">Export Excel</span>
          </button>
          <button class="btn btn-ghost btn-sm" onclick="App.openStockForm()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="appsheet-btn-label">Tambah Manual</span>
          </button>` : `
          <div style="font-size:12px;color:var(--text-muted);padding:8px 12px;background:var(--bg-input);border-radius:var(--radius-md);border:1px solid var(--border-subtle);">
            Data dikelola oleh Manager.
          </div>`}
        </div>
      </div>

      <!-- Sumber legend -->
      <div class="appsheet-legend">
        <span style="font-size:12px;color:var(--text-muted);font-weight:600;white-space:nowrap;">Sumber data:</span>
        ${Object.entries(this.SUMBER_CFG).map(([k,c]) => {
          const cnt = stock.filter(s => (Array.isArray(s.sumber)?s.sumber:[s.sumber||'manual']).includes(k)).length;
          return `<span style="display:flex;align-items:center;gap:5px;font-size:12px;">
            <span style="width:9px;height:9px;border-radius:50%;background:${c.color};flex-shrink:0;"></span>
            <strong>${k}</strong> <span style="color:var(--text-muted);">(${cnt})</span>
          </span>`;
        }).join('')}
        <span class="appsheet-legend-hint">Kunci: <strong>Kode + Gudang</strong>. Data multi-sumber digabung otomatis.</span>
      </div>



      <!-- Toolbar filter (sticky di mobile) -->
      <div class="card appsheet-toolbar">
        <div class="search-input-wrap" style="flex:1;min-width:180px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="search-input" id="stock-search"
            placeholder="Cari kode, nama, pemasok..."
            value="${_f.search}"
            oninput="App.filterStock('search', this.value)" />
        </div>
        <div class="appsheet-selects">
          <select class="form-control appsheet-select" onchange="App.filterStock('sumber',this.value)">
            <option value="all" ${_f.sumber==='all'?'selected':''}>Semua Sumber</option>
            ${sumberList.map(s=>`<option value="${s}" ${_f.sumber===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <select class="form-control appsheet-select" onchange="App.filterStock('kategori',this.value)">
            <option value="all" ${_f.kategori==='all'?'selected':''}>Semua Kategori</option>
            ${kategoriList.map(k=>`<option value="${k}" ${_f.kategori===k?'selected':''}>${k}</option>`).join('')}
          </select>
          <select class="form-control appsheet-select" onchange="App.filterStock('gudang',this.value)">
            <option value="all" ${_f.gudang==='all'?'selected':''}>Semua Gudang</option>
            ${gudangList.map(g=>`<option value="${g}" ${_f.gudang===g?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Hasil (hanya bagian ini yang di-update saat filter berubah) -->
      <div id="stock-results-area" style="margin-top:8px;">
        ${this._renderStockResults()}
      </div>
    </div>`;
  },

  openStockForm(id) {
    const item = id ? DB.getStockById(id) : null;
    const title = item ? 'Edit Item Stock' : 'Tambah Item Stock';

    const fmtNum = n => n ? Number(n).toLocaleString('id-ID') : '';

    App.openModal(title, `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Kode Barang</label>
            <input type="text" class="form-control" id="sf-kode" placeholder="Cth: ALK-001"
              value="${item ? item.kode : ''}" ${item ? 'readonly style="background:var(--bg-input);color:var(--text-muted);"' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">Satuan</label>
            <input type="text" class="form-control" id="sf-satuan" placeholder="Unit / Box / Pcs"
              value="${item ? item.satuan : 'Unit'}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nama Barang</label>
          <input type="text" class="form-control" id="sf-nama" placeholder="Nama lengkap barang"
            value="${item ? item.nama : ''}" />
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Kategori</label>
            <input type="text" class="form-control" id="sf-kategori" placeholder="Cth: Alat Diagnostik"
              value="${item ? item.kategori : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Gudang</label>
            <input type="text" class="form-control" id="sf-gudang" placeholder="Gudang A / Gudang B"
              value="${item ? item.gudang : 'Gudang A'}" />
          </div>
        </div>
        <div class="form-row form-row-3">
          <div class="form-group">
            <label class="form-label">Stok Saat Ini</label>
            <input type="text" class="form-control" id="sf-stok"
              placeholder="0" value="${item ? fmtNum(item.stok) : ''}"
              oninput="this.value=this.value.replace(/\\D/g,'')" />
          </div>
          <div class="form-group">
            <label class="form-label">Stok Minimum</label>
            <input type="text" class="form-control" id="sf-stokmin"
              placeholder="0" value="${item ? fmtNum(item.stokMin) : ''}"
              oninput="this.value=this.value.replace(/\\D/g,'')" />
          </div>
          <div class="form-group">
            <label class="form-label">Harga Satuan (Rp)</label>
            <input type="text" class="form-control" id="sf-harga"
              placeholder="0" value="${item ? fmtNum(item.harga) : ''}"
              oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/(\\d)(?=(\\d{3})+$)/g,'$1.')" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Keterangan</label>
          <input type="text" class="form-control" id="sf-ket" placeholder="Catatan tambahan (opsional)"
            value="${item ? (item.keterangan || '') : ''}" />
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="App.closeModal()">Batal</button>
          <button class="btn btn-primary" onclick="App.saveStockForm('${id || ''}')">
            ${item ? 'Simpan Perubahan' : 'Tambah Item'}
          </button>
        </div>
      </div>
    `);
  },

  saveStockForm(id) {
    const kode     = document.getElementById('sf-kode').value.trim().toUpperCase();
    const nama     = document.getElementById('sf-nama').value.trim();
    const kategori = document.getElementById('sf-kategori').value.trim();
    const satuan   = document.getElementById('sf-satuan').value.trim();
    const gudang   = document.getElementById('sf-gudang').value.trim();
    const stok     = parseInt(document.getElementById('sf-stok').value.replace(/\D/g, '')) || 0;
    const stokMin  = parseInt(document.getElementById('sf-stokmin').value.replace(/\D/g, '')) || 0;
    const harga    = parseInt(document.getElementById('sf-harga').value.replace(/\D/g, '')) || 0;
    const ket      = document.getElementById('sf-ket').value.trim();

    if (!kode) { App.Toast.show('Masukkan kode barang', 'warning'); return; }
    if (!nama) { App.Toast.show('Masukkan nama barang', 'warning'); return; }

    const payload = { kode, nama, kategori, satuan, stok, stokMin, harga, gudang, keterangan: ket };

    if (id) {
      DB.updateStock(id, payload);
      App.Toast.show('Item berhasil diperbarui', 'success');
    } else {
      if (DB.getStockByKode(kode)) { App.Toast.show('Kode barang sudah ada', 'warning'); return; }
      DB.addStock({ id: DB.genId(), ...payload, updatedAt: DB.today() });
      App.Toast.show('Item berhasil ditambahkan', 'success');
    }
    App.closeModal();
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = this.renderAppsheet();
  },

  deleteStock(id) {
    const item = DB.getStockById(id);
    if (!item) return;
    if (!confirm(`Hapus "${item.nama}" dari stock?`)) return;
    DB.deleteStock(id);
    App.Toast.show('Item dihapus', 'success');
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = this.renderAppsheet();
  },

  // ── Export semua data stock ke Excel ──
  exportStockExcel() {
    if (typeof XLSX === 'undefined') { App.Toast.show('Library Excel belum siap, coba refresh halaman', 'error'); return; }
    const stock = DB.getStock();
    const rows  = stock.map(s => ({
      'Kode Barang':             s.kode,
      'Nama Barang':             s.nama,
      'Nama Gudang':             s.gudang || '',
      'Kuantitas':               s.stok ?? 0,
      'Def. Hrg. Jual Satuan #1': s.hargaJual || 0,
      'Default Diskon (%)':      s.diskon  || 0,
      'Satuan':                  s.satuan  || '',
      'Kategori Barang':         s.kategori || '',
      'Nama Lengkap Kontak Utama Pemasok Utama': s.pemasok || '',
      'Sumber':                  Array.isArray(s.sumber) ? s.sumber.join(', ') : (s.sumber || 'manual'),
      'Terakhir Update':         s.updatedAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [14,40,28,10,22,18,10,22,35,14,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Gudang');
    XLSX.writeFile(wb, `stock_gudang_${DB.today()}.xlsx`);
    App.Toast.show(`${rows.length} item berhasil diekspor`, 'success');
  },

  // ── Download template Excel kosong ──
  downloadStockTemplate() {
    if (typeof XLSX === 'undefined') { App.Toast.show('Library Excel belum siap, coba refresh halaman', 'error'); return; }
    const headers = [['Kode Barang','Nama Barang','Kategori','Satuan','Stok','Stok Minimum','Harga (Rp)','Gudang','Keterangan']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [12,35,22,10,8,12,18,12,25].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Gudang');
    XLSX.writeFile(wb, 'template_stock_gudang.xlsx');
    App.Toast.show('Template berhasil diunduh', 'success');
  },

  // ── Parser per tipe: kembalikan payload standar dari 1 row Excel ──
  parseStockRow(raw, type) {
    const str = (v) => (v !== undefined && v !== null ? v.toString().trim() : '');
    const num = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      return parseFloat(str(v).replace(/[^\d.-]/g, '')) || 0;
    };

    let kode, nama, gudang, stok, hargaJual, diskon, satuan, kategori, pemasok;

    if (type === 'SBI') {
      // A: Kode Barang, B: Nama Barang, C: Kuantitas,
      // D: Default Diskon (%), E: Def. Hrg. Jual Satuan #1, F: Satuan, G: Nama Gudang
      kode      = str(raw['Kode Barang']);
      nama      = str(raw['Nama Barang']);
      stok      = num(raw['Kuantitas']);
      diskon    = num(raw['Default Diskon (%)']);
      hargaJual = num(raw['Def. Hrg. Jual Satuan #1']);
      satuan    = str(raw['Satuan']) || 'Unit';
      gudang    = str(raw['Nama Gudang']);
      kategori  = '';
      pemasok   = '';

    } else if (type === 'KBT') {
      // A: Nama Gudang, B: Kode Barang, C: Nama Barang, D: Kuantitas,
      // E: Def. Hrg. Jual Satuan #1, F: Default Diskon (%), G: Kategori Barang
      gudang    = str(raw['Nama Gudang']);
      kode      = str(raw['Kode Barang']);
      nama      = str(raw['Nama Barang']);
      stok      = num(raw['Kuantitas']);
      hargaJual = num(raw['Def. Hrg. Jual Satuan #1']);
      diskon    = num(raw['Default Diskon (%)']);
      satuan    = 'Unit';
      kategori  = str(raw['Kategori Barang']);
      pemasok   = '';

    } else if (type === 'KDS') {
      // A: Nama Gudang, B: Kode Barang, C: Nama Barang, D: Kuantitas,
      // E: Nama Lengkap Kontak Utama Pemasok Utama,
      // F: Def. Hrg. Jual Satuan #1, G: Default Diskon (%)
      gudang    = str(raw['Nama Gudang']);
      kode      = str(raw['Kode Barang']);
      nama      = str(raw['Nama Barang']);
      stok      = num(raw['Kuantitas']);
      pemasok   = str(raw['Nama Lengkap Kontak Utama Pemasok Utama']);
      hargaJual = num(raw['Def. Hrg. Jual Satuan #1']);
      diskon    = num(raw['Default Diskon (%)']);
      satuan    = 'Unit';
      kategori  = '';

    } else {
      // Generic / template manual
      kode      = str(raw['Kode Barang']);
      nama      = str(raw['Nama Barang']);
      kategori  = str(raw['Kategori']);
      satuan    = str(raw['Satuan']) || 'Unit';
      stok      = num(raw['Stok'] ?? raw['Kuantitas']);
      hargaJual = num(raw['Harga (Rp)'] ?? raw['Def. Hrg. Jual Satuan #1']);
      diskon    = num(raw['Default Diskon (%)']);
      gudang    = str(raw['Gudang'] ?? raw['Nama Gudang']) || 'Gudang A';
      pemasok   = str(raw['Pemasok'] ?? raw['Nama Lengkap Kontak Utama Pemasok Utama']);
    }

    return { kode, nama, gudang, stok, hargaJual, diskon, satuan, kategori, pemasok, sumber: type };
  },

  // ── Import Excel (KBT / SBI / KDS) — bulk upsert untuk performa optimal ──
  importStockExcel(input, type = 'generic') {
    const file = input.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { App.Toast.show('Library Excel belum siap, coba refresh', 'error'); return; }

    App.Toast.show(`Membaca file ${type}...`, 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
      // Gunakan setTimeout agar browser sempat render toast sebelum komputasi berat
      setTimeout(() => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

          if (!data.length) { App.Toast.show('File kosong atau format tidak dikenali', 'warning'); return; }

          // Petakan semua baris ke format standar dulu
          const rows = data
            .map(raw => this.parseStockRow(raw, type))
            .filter(r => r.kode);                         // buang baris tanpa kode

          // Bulk upsert: baca localStorage 1×, proses semua, tulis 1×
          const result = DB.bulkUpsertStockByKodeGudang(rows);
          const skipped = data.length - rows.length;

          // Reset ke halaman 1, refresh
          if (this._stockFilter) this._stockFilter.page = 0;
          const content = document.getElementById('page-content');
          if (content) content.innerHTML = this.renderAppsheet();

          App.Toast.show(
            `[${type}] Selesai: ${result.updated} diperbarui, ${result.added} ditambah${(skipped + result.skipped) > 0 ? ', ' + (skipped + result.skipped) + ' dilewati' : ''}`,
            'success'
          );
        } catch (err) {
          console.error('Import error:', err);
          App.Toast.show(`Gagal membaca file ${type}. Pastikan format .xlsx benar.`, 'error');
        }
        input.value = '';
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  },

  renderSalesDashboard(user) {
    const myTxs = DB.getTransactionsBySales(user.id);
    const totalSales = myTxs.reduce((s, t) => s + t.totalAmount, 0);
    const txToday = myTxs.filter(t => DB.isInPeriod(t.date, 'daily')).length;
    const txMonth = myTxs.filter(t => DB.isInPeriod(t.date, 'monthly')).reduce((s, t) => s + t.totalAmount, 0);
    const myDoctors = DB.getDoctors().filter(d => d.salesId === user.id);
    const totalStamps = myDoctors.reduce((s, d) => s + d.stamps, 0);
    const rewardReady = myDoctors.filter(d => d.stamps >= 4).length;

    const pct = user.target > 0 ? Math.min((totalSales / user.target) * 100, 100) : 0;
    const board = DB.getLeaderboard();
    const myRank = board.findIndex(s => s.id === user.id) + 1;

    const recentTxs = myTxs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    return `
    <div class="fade-in">
      <!-- Welcome Banner -->
      <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-xl);padding:28px;margin-bottom:28px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.2),transparent 70%);"></div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:6px;">${new Date().toLocaleDateString('id-ID', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        <h2 style="font-size:24px;font-weight:800;margin-bottom:4px;">Halo, ${user.name.split(' ')[0]}! 👋</h2>
        <p style="color:var(--text-secondary);">Area: ${user.area} • Peringkat saat ini: <strong style="color:var(--warning);">#${myRank}</strong></p>
        ${user.target > 0 ? `
        <div style="margin-top:16px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
            <span style="color:var(--text-muted);">Progress Target Bulan Ini</span>
            <span style="color:${pct>=100?'var(--success)':pct>70?'var(--warning)':'var(--primary-light)'};">${pct.toFixed(1)}% dari ${DB.formatRupiah(user.target)}</span>
          </div>
          <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${pct>=100?'var(--grad-success)':'var(--grad-primary)'};border-radius:20px;transition:width 1s ease;"></div>
          </div>
        </div>` : ''}
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-value" style="font-size:20px;">${DB.formatRupiah(totalSales)}</div>
          <div class="stat-label">Total Penjualan</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-value" style="font-size:20px;">${DB.formatRupiah(txMonth)}</div>
          <div class="stat-label">Omset Bulan Ini</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          </div>
          <div class="stat-value">${txToday}</div>
          <div class="stat-label">Transaksi Hari Ini</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="stat-value">${totalStamps}</div>
          <div class="stat-label">Stamp Aktif ${rewardReady > 0 ? `<span class="badge badge-gold" style="margin-left:4px;">🎁 ${rewardReady} Reward</span>` : ''}</div>
        </div>
      </div>

      <!-- Quick Actions + Recent Transactions -->
      <div class="grid-2" style="margin-top:24px;gap:20px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚡ Aksi Cepat</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-primary" onclick="App.navigate('transactions');setTimeout(()=>Transactions.openNewForm(),100);" style="justify-content:flex-start;gap:12px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Input Transaksi Baru
            </button>
            <button class="btn btn-secondary" onclick="App.navigate('loyalty')" style="justify-content:flex-start;gap:12px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Cek Stamp Dokter
            </button>
            <button class="btn btn-ghost" onclick="App.navigate('leaderboard')" style="justify-content:flex-start;gap:12px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Lihat Leaderboard
            </button>
            <button class="btn btn-ghost" onclick="App.navigate('products')" style="justify-content:flex-start;gap:12px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Best Products
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🕐 Transaksi Terbaru</div>
            <a onclick="App.navigate('transactions')" style="cursor:pointer;font-size:12px;color:var(--primary-light);">Lihat Semua →</a>
          </div>
          ${recentTxs.length === 0 ? `<div class="empty-state" style="padding:24px;">
            <p>Belum ada transaksi. Mulai catat sekarang!</p>
          </div>` :
          `<div style="display:flex;flex-direction:column;gap:8px;">
            ${recentTxs.map(tx => {
              const doc = DB.getDoctorById(tx.doctorId);
              const doctorName = doc ? doc.name : tx.doctorId || '–';
              const initials = doc ? DB.initials(doc.name) : DB.initials(tx.doctorId);
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-input);border-radius:var(--radius-md);">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--grad-primary);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doctorName}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${DB.formatDateShort(tx.date)}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-size:13px;font-weight:700;color:var(--primary-light);">${DB.formatRupiah(tx.totalAmount)}</div>
                  ${tx.stampGiven > 0 ? '<div style="font-size:10px;color:var(--warning);">⭐ +1 Stamp</div>' : ''}
                </div>
              </div>`;
            }).join('')}
          </div>`}
        </div>
      </div>
    </div>`;
  },

  renderManagerDashboard(user) {
    const board = DB.getLeaderboard();
    const allTxs = DB.getTransactions();
    const totalRevenue = allTxs.reduce((s, t) => s + t.totalAmount, 0);
    const txToday = allTxs.filter(t => DB.isInPeriod(t.date, 'daily')).length;
    const txMonth = allTxs.filter(t => DB.isInPeriod(t.date, 'monthly')).reduce((s, t) => s + t.totalAmount, 0);
    const bestProducts = DB.getBestProducts('monthly').slice(0, 5);

    return `
    <div class="fade-in">
      <!-- Welcome Banner -->
      <div style="background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.1));border:1px solid rgba(139,92,246,0.2);border-radius:var(--radius-xl);padding:28px;margin-bottom:28px;">
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:6px;">${new Date().toLocaleDateString('id-ID', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        <h2 style="font-size:24px;font-weight:800;margin-bottom:4px;">Selamat Datang, Manager ${user.name.split(' ')[0]}! 🛡️</h2>
        <p style="color:var(--text-secondary);">Ringkasan kinerja tim sales Anda hari ini</p>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon primary"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="stat-value" style="font-size:18px;">${DB.formatRupiah(totalRevenue)}</div>
          <div class="stat-label">Total Omset Tim</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon success"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="stat-value" style="font-size:18px;">${DB.formatRupiah(txMonth)}</div>
          <div class="stat-label">Omset Bulan Ini</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon warning"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
          <div class="stat-value">${txToday}</div>
          <div class="stat-label">Transaksi Hari Ini</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon info"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div class="stat-value">${board.length}</div>
          <div class="stat-label">Anggota Tim Sales</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:24px;gap:20px;">
        <!-- Team Performance -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">👥 Kinerja Tim</div>
            <a onclick="App.navigate('leaderboard')" style="cursor:pointer;font-size:12px;color:var(--primary-light);">Leaderboard →</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${board.slice(0, 5).map((s, i) => {
              const pct = s.target > 0 ? Math.min((s.total / s.target) * 100, 100) : 0;
              const achieved = s.target > 0 && s.total >= s.target;
              return `
              <div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                  <div style="font-size:16px;font-weight:800;width:24px;color:${i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--text-muted)'};">${i+1}</div>
                  <div class="user-avatar" style="width:30px;height:30px;font-size:11px;">${DB.initials(s.name)}</div>
                  <div style="flex:1;font-size:13px;font-weight:600;">${s.name}</div>
                  ${achieved ? '<span class="badge badge-success" style="font-size:10px;">✅</span>' : ''}
                  <div style="font-size:13px;font-weight:700;color:var(--primary-light);">${DB.formatRupiah(s.total)}</div>
                </div>
                <div class="progress-bar">
                  <div style="height:100%;width:${pct}%;background:${achieved?'var(--grad-success)':pct>70?'var(--grad-gold)':'var(--grad-primary)'};border-radius:20px;transition:width 0.8s ease;"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Top Products -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🏆 Top 5 Produk (Bulan Ini)</div>
            <a onclick="App.navigate('products')" style="cursor:pointer;font-size:12px;color:var(--primary-light);">Lihat Semua →</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${bestProducts.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">Tidak ada data</p>' :
              bestProducts.map((prod, i) => {
                const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
                return `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-input);border-radius:var(--radius-md);">
                  <span style="font-size:18px;">${medals[i]}</span>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${prod.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${prod.category} • ${prod.qty} unit</div>
                  </div>
                  <div style="font-size:13px;font-weight:700;color:var(--primary-light);flex-shrink:0;">${DB.formatRupiah(prod.revenue)}</div>
                </div>`;
              }).join('')}
          </div>
        </div>
      </div>

      <!-- Quick Nav -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:24px;">
        ${[
          {page:'transactions',icon:'📋',label:'Semua Transaksi',sub:'Riwayat lengkap tim'},
          {page:'loyalty',icon:'⭐',label:'Loyalty Program',sub:'Distribusi stamp dokter'},
          {page:'products',icon:'📊',label:'Best Products',sub:'Analitik produk terlaris'},
          {page:'leaderboard',icon:'🏆',label:'Leaderboard',sub:'Peringkat sales'},
          {page:'manager',icon:'🎯',label:'Set Target',sub:'Kelola target individu'},
        ].map(item => `
          <div onclick="App.navigate('${item.page}')" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:18px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--bg-card-hover)'" onmouseout="this.style.borderColor='var(--border-subtle)';this.style.background='var(--bg-card)'">
            <div style="font-size:28px;margin-bottom:8px;">${item.icon}</div>
            <div style="font-size:14px;font-weight:700;">${item.label}</div>
            <div style="font-size:12px;color:var(--text-muted);">${item.sub}</div>
          </div>`).join('')}
      </div>
    </div>`;
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed');
    }
  },

  // ---- Modal ----
  openModal(title, body, extraClass = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const container = document.getElementById('modal-container');
    container.className = 'modal-container ' + extraClass;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    document.body.style.overflow = '';
  },

  // ---- Toast ----
  Toast: {
    show(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      };

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span>${message}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('out');
        toast.addEventListener('animationend', () => toast.remove());
      }, 3500);
    }
  },

  // ---- Clock ----
  startClock() {
    const update = () => {
      const now = new Date();
      const el = document.getElementById('topbar-time');
      if (el) el.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    update();
    setInterval(update, 1000);
  },
};

// Add loading spinner CSS
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(99,102,241,0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(spinnerStyle);

// Mobile sidebar close on click outside
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (sidebar && window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
    if (!sidebar.contains(e.target) && e.target !== menuBtn && !menuBtn?.contains(e.target)) {
      sidebar.classList.remove('mobile-open');
    }
  }
});

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

/* ============================================================
   APP — SPA Router, Navigation, Toast, Modal
   ============================================================ */

const App = {
  currentPage: null,

  init() {
    // Seed data
    DB.seed();
    // Start clock
    this.startClock();
    // Check session
    if (!Auth.checkSession()) {
      document.getElementById('login-page').classList.remove('hidden');
    }
    // Keyboard: ESC closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
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
      transactions: 'Transaksi',
      loyalty: 'Loyalty Stamp',
      products: '20 Best Products',
      leaderboard: 'Leaderboard',
      manager: 'Panel Manager',
    };
    document.getElementById('page-title').textContent = titles[page] || page;

    // Render page content
    const content = document.getElementById('page-content');
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;"><div class="loading-spinner"></div></div>';

    setTimeout(() => {
      let html = '';
      switch (page) {
        case 'dashboard':   html = this.renderDashboard(user); break;
        case 'transactions': html = Transactions.renderPage(); break;
        case 'loyalty':     html = Loyalty.renderPage(); break;
        case 'products':    html = Products.renderPage(); break;
        case 'leaderboard': html = Leaderboard.renderPage(); break;
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
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-input);border-radius:var(--radius-md);">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--grad-primary);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${doc ? DB.initials(doc.name) : '?'}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc ? doc.name : '–'}</div>
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
          {page:'loyalty',icon:'⭐',label:'Loyalty Stamp',sub:'Distribusi stamp dokter'},
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

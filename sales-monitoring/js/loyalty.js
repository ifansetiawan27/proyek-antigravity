/* ============================================================
   LOYALTY STAMP MODULE
   ============================================================ */

const Loyalty = {
  STAMP_TOTAL: 4,   // 4 stamps = reward

  renderPage() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    let doctors = isManager ? DB.getDoctors() : DB.getDoctors().filter(d => d.salesId === user.id);

    return `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>⭐ Loyalty Stamp Dokter</h1>
          <p>${isManager ? 'Program loyalitas seluruh dokter' : 'Program loyalitas dokter di area Anda'}</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <div class="filter-tabs">
            <button class="filter-tab active" id="tab-all" onclick="Loyalty.filterDoctors('all')">Semua</button>
            <button class="filter-tab" id="tab-active" onclick="Loyalty.filterDoctors('active')">Aktif</button>
            <button class="filter-tab" id="tab-reward" onclick="Loyalty.filterDoctors('reward')">Reward Ready 🎁</button>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card primary">
          <div class="stat-icon primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-value">${doctors.length}</div>
          <div class="stat-label">Total Dokter</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="stat-value">${doctors.reduce((s, d) => s + d.stamps, 0)}</div>
          <div class="stat-label">Total Stamp Aktif</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div class="stat-value">${doctors.filter(d => d.stamps >= this.STAMP_TOTAL).length}</div>
          <div class="stat-label">Reward Ready</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-value">${DB.formatRupiah(doctors.reduce((s, d) => s + d.totalPurchase, 0))}</div>
          <div class="stat-label">Total Pembelian</div>
        </div>
      </div>

      <!-- Doctor Search -->
      <div class="card" style="margin-bottom:16px;">
        <div class="search-input-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="search-input" id="doc-search" placeholder="Cari nama dokter atau klinik..." oninput="Loyalty.searchDoctors()" />
        </div>
      </div>

      <!-- Doctor List -->
      <div id="doctor-list-container">
        ${this.renderDoctorList(doctors)}
      </div>
    </div>`;
  },

  renderDoctorList(doctors) {
    if (doctors.length === 0) {
      return `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>Tidak ada dokter ditemukan</p>
      </div>`;
    }

    return `<div class="doctor-list">${doctors.map(doc => this.renderDoctorCard(doc)).join('')}</div>`;
  },

  renderDoctorCard(doc) {
    const effectiveStamps = doc.stamps % this.STAMP_TOTAL === 0 && doc.stamps > 0 ? this.STAMP_TOTAL : doc.stamps % this.STAMP_TOTAL;
    const isReward = doc.stamps >= this.STAMP_TOTAL;
    const rewardCount = Math.floor(doc.stamps / this.STAMP_TOTAL);
    const salesUser = DB.getUserById(doc.salesId);

    const stamps = Array.from({ length: this.STAMP_TOTAL }, (_, i) => {
      const filled = i < effectiveStamps;
      return `<div class="stamp-dot ${filled ? 'filled' : ''}">${filled ? '⭐' : ''}</div>`;
    }).join('');

    return `
    <div class="stamp-card" onclick="Loyalty.showDoctorDetail('${doc.id}')" style="cursor:pointer;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
          <div class="user-avatar" style="width:46px;height:46px;font-size:16px;background:${isReward ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--grad-primary)'}">
            ${DB.initials(doc.name)}
          </div>
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;">
              ${doc.name}
              ${isReward ? `<span class="badge badge-gold">🎁 ${rewardCount}x Reward</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--text-muted);">${doc.clinic} • ${doc.area}</div>
            ${Auth.isManager() ? `<div style="font-size:11px;color:var(--primary-light);margin-top:2px;">Sales: ${salesUser ? salesUser.name : '–'}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:18px;font-weight:800;color:var(--warning);">${doc.stamps}</div>
          <div style="font-size:10px;color:var(--text-muted);">Total Stamp</div>
        </div>
      </div>

      <div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:8px;">
          <span>Progress Stamp (${effectiveStamps}/${this.STAMP_TOTAL})</span>
          <span>${DB.formatRupiah(doc.totalPurchase)} total pembelian</span>
        </div>
        <div class="stamp-grid">${stamps}</div>
        <div style="margin-top:8px;font-size:11px;color:${isReward ? 'var(--warning)' : 'var(--text-muted)'};text-align:center;">
          ${isReward ? `🎁 Selamat! Dokter ini sudah mendapatkan reward ${rewardCount}x` : `Butuh ${this.STAMP_TOTAL - effectiveStamps} stamp lagi untuk reward`}
        </div>
      </div>
    </div>`;
  },

  _currentFilter: 'all',

  filterDoctors(filter) {
    this._currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${filter}`)?.classList.add('active');
    this.refreshList();
  },

  searchDoctors() {
    this.refreshList();
  },

  refreshList() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    const search = (document.getElementById('doc-search')?.value || '').toLowerCase();
    let doctors = isManager ? DB.getDoctors() : DB.getDoctors().filter(d => d.salesId === user.id);

    if (this._currentFilter === 'active') {
      doctors = doctors.filter(d => d.stamps > 0);
    } else if (this._currentFilter === 'reward') {
      doctors = doctors.filter(d => d.stamps >= this.STAMP_TOTAL);
    }

    if (search) {
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(search) ||
        d.clinic.toLowerCase().includes(search)
      );
    }

    const container = document.getElementById('doctor-list-container');
    if (container) container.innerHTML = this.renderDoctorList(doctors);
  },

  showDoctorDetail(id) {
    const doc = DB.getDoctorById(id);
    if (!doc) return;

    const txs = DB.getTransactions()
      .filter(t => t.doctorId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const effectiveStamps = doc.stamps % this.STAMP_TOTAL === 0 && doc.stamps > 0 ? this.STAMP_TOTAL : doc.stamps % this.STAMP_TOTAL;
    const rewardCount = Math.floor(doc.stamps / this.STAMP_TOTAL);
    const salesUser = DB.getUserById(doc.salesId);

    const stamps = Array.from({ length: this.STAMP_TOTAL }, (_, i) => {
      const filled = i < effectiveStamps;
      return `<div class="stamp-dot ${filled ? 'filled' : ''}" style="width:60px;height:60px;font-size:28px;">${filled ? '⭐' : ''}</div>`;
    }).join('');

    const txRows = txs.length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Belum ada transaksi</td></tr>`
      : txs.map(tx => `<tr>
          <td>${DB.formatDate(tx.date)}</td>
          <td style="color:var(--primary-light);font-weight:600;">${DB.formatRupiah(tx.totalAmount)}</td>
          <td>${tx.stampGiven > 0 ? '<span class="badge badge-gold">⭐ +1</span>' : '<span style="color:var(--text-muted)">–</span>'}</td>
        </tr>`).join('');

    App.openModal(`Profil Dokter — ${doc.name}`, `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--bg-input);border-radius:var(--radius-md);">
          <div class="user-avatar" style="width:56px;height:56px;font-size:20px;background:${doc.stamps >= this.STAMP_TOTAL ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--grad-primary)'}">
            ${DB.initials(doc.name)}
          </div>
          <div>
            <div style="font-size:17px;font-weight:800;">${doc.name}</div>
            <div style="font-size:13px;color:var(--text-muted);">${doc.clinic}</div>
            <div style="font-size:12px;color:var(--text-muted);">Area: ${doc.area} • Sales: ${salesUser ? salesUser.name : '–'}</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <div style="font-size:28px;font-weight:900;color:var(--warning);">${doc.stamps}</div>
            <div style="font-size:11px;color:var(--text-muted);">Total Stamp</div>
          </div>
        </div>

        <!-- Stamp Card -->
        <div>
          <div style="font-weight:700;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
            <span>Buku Stamp</span>
            ${rewardCount > 0 ? `<span class="badge badge-gold">🎁 ${rewardCount}x Reward Diterima</span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">${stamps}</div>
          <div style="margin-top:12px;text-align:center;padding:10px;background:${doc.stamps >= this.STAMP_TOTAL ? 'rgba(245,158,11,0.1)' : 'var(--bg-input)'};border-radius:var(--radius-md);border:1px solid ${doc.stamps >= this.STAMP_TOTAL ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'};">
            ${doc.stamps >= this.STAMP_TOTAL
              ? `<span style="color:var(--warning);font-weight:600;">🎁 Reward Ready! Dokter berhak mendapat hadiah</span>`
              : `<span style="color:var(--text-muted);">Kumpulkan ${this.STAMP_TOTAL - effectiveStamps} stamp lagi untuk reward berikutnya</span>`}
          </div>
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">TOTAL PEMBELIAN</div>
            <div style="font-size:18px;font-weight:800;color:var(--primary-light);">${DB.formatRupiah(doc.totalPurchase)}</div>
          </div>
          <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">TOTAL TRANSAKSI</div>
            <div style="font-size:18px;font-weight:800;">${txs.length}</div>
          </div>
        </div>

        <!-- Transaction History -->
        <div>
          <div style="font-weight:700;margin-bottom:12px;">Riwayat Transaksi Terkini</div>
          <div class="table-wrapper">
            <table class="table" style="font-size:13px;">
              <thead><tr><th>Tanggal</th><th>Total</th><th>Stamp</th></tr></thead>
              <tbody>${txRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `, 'modal-lg');
  },
};

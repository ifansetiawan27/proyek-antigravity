/* ============================================================
   MANAGER PANEL MODULE
   ============================================================ */

const Manager = {
  renderPage() {
    const salesUsers = DB.getUsers().filter(u => u.role === 'sales');
    const allTxs = DB.getTransactions();
    const allDoctors = DB.getDoctors();
    const board = DB.getLeaderboard();

    const totalRevenue = allTxs.reduce((s, t) => s + t.totalAmount, 0);
    const totalTxs = allTxs.length;
    const totalDoctors = allDoctors.length;
    const totalStamps = allDoctors.reduce((s, d) => s + d.stamps, 0);

    return `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>🛡️ Panel Manager</h1>
          <p>Pengawasan menyeluruh, penetapan target, dan analitik tim</p>
        </div>
      </div>

      <!-- Global Stats -->
      <div class="stats-grid" style="margin-bottom:28px;">
        <div class="stat-card primary">
          <div class="stat-icon primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-value" style="font-size:18px;">${DB.formatRupiah(totalRevenue)}</div>
          <div class="stat-label">Total Omset Tim</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="stat-value">${totalTxs}</div>
          <div class="stat-label">Total Transaksi</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="stat-value">${totalDoctors}</div>
          <div class="stat-label">Total Dokter</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="stat-value">${totalStamps}</div>
          <div class="stat-label">Total Stamp Aktif</div>
        </div>
      </div>

      <div class="grid-2" style="gap:24px;">
        <!-- Target Setting -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🎯 Penetapan Target Sales</div>
              <div class="card-subtitle">Input dan perbarui target penjualan per sales</div>
            </div>
          </div>
          <div class="target-sales-list" id="target-list">
            ${salesUsers.map(u => this.renderTargetItem(u)).join('')}
          </div>
        </div>

        <!-- Performance Report -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">📈 Laporan Progres Tim</div>
              <div class="card-subtitle">Aktual vs Target masing-masing sales</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${board.map(s => this.renderProgressReport(s)).join('')}
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <div>
            <div class="card-title">🕐 Transaksi Terbaru</div>
            <div class="card-subtitle">20 transaksi terkini dari seluruh tim</div>
          </div>
          <a onclick="App.navigate('transactions')" style="cursor:pointer;font-size:13px;color:var(--primary-light);">Lihat Semua →</a>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Sales</th>
                <th>Dokter</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th>Stamp</th>
              </tr>
            </thead>
            <tbody>
              ${DB.getTransactions().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20).map(tx => {
                const doc = DB.getDoctorById(tx.doctorId);
                const salesUser = DB.getUserById(tx.salesId);
                return `<tr>
                  <td><span class="badge badge-primary">${salesUser ? salesUser.name : '–'}</span></td>
                  <td>
                    <div style="font-weight:600;font-size:13px;">${doc ? doc.name : '–'}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${doc ? doc.clinic : ''}</div>
                  </td>
                  <td style="color:var(--text-secondary);font-size:13px;">${DB.formatDate(tx.date)}</td>
                  <td style="font-weight:700;color:var(--primary-light);">${DB.formatRupiah(tx.totalAmount)}</td>
                  <td>${tx.stampGiven > 0 ? '<span class="badge badge-gold">⭐ +1</span>' : '<span style="color:var(--text-muted)">–</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Doctor Stamp Overview -->
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <div>
            <div class="card-title">⭐ Distribusi Stamp Dokter</div>
            <div class="card-subtitle">Ringkasan loyalty program seluruh dokter</div>
          </div>
          <a onclick="App.navigate('loyalty')" style="cursor:pointer;font-size:13px;color:var(--primary-light);">Lihat Detail →</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${DB.getDoctors().sort((a,b) => b.stamps - a.stamps).slice(0, 8).map(doc => {
            const effectiveStamps = doc.stamps % 4 === 0 && doc.stamps > 0 ? 4 : doc.stamps % 4;
            const isReward = doc.stamps >= 4;
            return `
            <div style="background:var(--bg-input);border:1px solid ${isReward ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'};border-radius:var(--radius-md);padding:14px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <div class="user-avatar" style="width:36px;height:36px;font-size:13px;background:${isReward?'linear-gradient(135deg,#f59e0b,#d97706)':'var(--grad-primary)'};">${DB.initials(doc.name)}</div>
                <div>
                  <div style="font-size:13px;font-weight:600;">${doc.name.split(' ').slice(0, 2).join(' ')}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${doc.clinic}</div>
                </div>
              </div>
              <div style="display:flex;gap:4px;">
                ${Array.from({length:4},(_,i)=>`<div style="flex:1;height:6px;border-radius:3px;background:${i<effectiveStamps?'var(--warning)':'rgba(255,255,255,0.06)'}"></div>`).join('')}
              </div>
              <div style="font-size:11px;color:${isReward?'var(--warning)':'var(--text-muted)'};margin-top:6px;text-align:center;">
                ${isReward ? '🎁 Reward Ready!' : `${effectiveStamps}/4 stamp`}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  },

  renderTargetItem(user) {
    const current = DB.getSalesTotalBySalesId(user.id);
    const pct = user.target > 0 ? Math.min((current / user.target) * 100, 100) : 0;

    return `
    <div class="target-sales-item" id="target-item-${user.id}">
      <div class="user-avatar">${DB.initials(user.name)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;">${user.name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${user.area}</div>
        <div style="font-size:11px;color:var(--primary-light);margin-top:2px;">Aktual: ${DB.formatRupiah(current)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input
          type="text"
          class="form-control"
          style="width:140px;font-size:13px;padding:7px 10px;"
          id="target-input-${user.id}"
          value="${user.target ? user.target.toLocaleString('id-ID') : ''}"
          placeholder="Target (Rp)"
          oninput="Manager.onTargetInput(this)"
        />
        <button class="btn btn-primary btn-sm" onclick="Manager.saveTarget('${user.id}')">
          Simpan
        </button>
      </div>
    </div>`;
  },

  formatTargetValue(value) {
    const digits = (value || '').toString().replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('id-ID') : '';
  },

  parseTargetValue(value) {
    const digits = (value || '').toString().replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  },

  onTargetInput(el) {
    if (!el) return;
    el.value = this.formatTargetValue(el.value);
  },

  saveTarget(salesId) {
    const input = document.getElementById(`target-input-${salesId}`);
    if (!input) return;

    const val = this.parseTargetValue(input.value);
    DB.updateUser(salesId, { target: val });
    App.Toast.show('Target berhasil diperbarui', 'success');

    if (App.currentPage === 'manager') {
      const content = document.getElementById('page-content');
      if (content) {
        content.innerHTML = Manager.renderPage();
      }
    }
  },

  renderProgressReport(s) {
    const pct = s.target > 0 ? Math.min((s.total / s.target) * 100, 100) : 0;
    const achieved = s.target > 0 && s.total >= s.target;
    const barColor = achieved ? 'var(--success)' : pct > 70 ? 'var(--warning)' : 'var(--primary)';

    return `
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div class="user-avatar" style="width:32px;height:32px;font-size:12px;">${DB.initials(s.name)}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;">
            ${s.name}
            ${achieved ? '<span class="badge badge-success" style="font-size:10px;">✅ Target Tercapai</span>' : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;font-weight:700;color:${barColor};">${pct.toFixed(1)}%</div>
        </div>
      </div>
      <div class="progress-bar">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:20px;transition:width 0.8s ease;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px;">
        <span>${DB.formatRupiah(s.total)}</span>
        <span>Target: ${s.target > 0 ? DB.formatRupiah(s.target) : 'Belum ditetapkan'}</span>
      </div>
    </div>`;
  },
};

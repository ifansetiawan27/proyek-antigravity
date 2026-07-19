/* ============================================================
   LOYALTY PROGRAM MODULE
   Rules:
   - 1 stamp per bulan jika TOTAL belanja bulan itu >= STAMP_MIN
   - Tidak berlaku kelipatan (max 1 stamp/bulan)
   - Reward = 4 bulan BERTURUT-TURUT dengan stamp
   ============================================================ */

const Loyalty = {
  STAMP_TOTAL: 4,      // bulan berturut-turut untuk reward
  STAMP_MIN:   1500000,
  _currentFilter: 'all',
  _selectedMonth: new Date().toISOString().slice(0, 7),

  // ─────────────────────────────────────────────────────────────
  //  CORE LOGIC
  // ─────────────────────────────────────────────────────────────

  getMonthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  isNextMonth(m1, m2) {
    const d1 = new Date(m1 + '-01');
    const d2 = new Date(m2 + '-01');
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) === 1;
  },

  monthLabel(monthKey, format = 'short') {
    if (!monthKey) return '';
    const opts = format === 'short'
      ? { month: 'short' }
      : { month: 'long', year: 'numeric' };
    return new Date(monthKey + '-01').toLocaleDateString('id-ID', opts);
  },

  getDoctorTransactions(docId) {
    return DB.getTransactions().filter(t => t.doctorId === docId);
  },

  getDoctorTransactionsByMonth(docId, month) {
    return this.getDoctorTransactions(docId).filter(t => this.getMonthKey(t.date) === month);
  },

  // Total belanja dokter di bulan tertentu
  getDoctorMonthTotalPurchase(docId, month) {
    return this.getDoctorTransactionsByMonth(docId, month)
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  },

  // Apakah dokter mendapat stamp di bulan ini? (total >= STAMP_MIN)
  getDoctorMonthStamp(docId, month) {
    return this.getDoctorMonthTotalPurchase(docId, month) >= this.STAMP_MIN;
  },

  // Alias untuk filter tab (approved = dapat stamp bulan ini)
  getDoctorMonthApprovedStamp(docId, month) {
    return this.getDoctorMonthStamp(docId, month) ? 1 : 0;
  },

  // Daftar bulan (sorted) di mana dokter mendapat stamp (total >= STAMP_MIN)
  getDoctorQualifiedMonths(docId) {
    const txs = this.getDoctorTransactions(docId);
    const monthTotals = {};
    txs.forEach(t => {
      const m = this.getMonthKey(t.date);
      monthTotals[m] = (monthTotals[m] || 0) + (t.totalAmount || 0);
    });
    return Object.keys(monthTotals)
      .filter(m => monthTotals[m] >= this.STAMP_MIN)
      .sort();
  },

  // Kelompokkan bulan qualified menjadi grup berturut-turut
  getConsecutiveGroups(months) {
    if (!months.length) return [];
    const groups = [];
    let current = [months[0]];
    for (let i = 1; i < months.length; i++) {
      if (this.isNextMonth(months[i - 1], months[i])) {
        current.push(months[i]);
      } else {
        groups.push(current);
        current = [months[i]];
      }
    }
    groups.push(current);
    return groups;
  },

  /*
   * Reward info untuk seorang dokter:
   *  - totalRewards     : jumlah reward yang sudah diterima (setiap 4 bulan berturut)
   *  - currentStreak    : progress bulan berturut saat ini menuju reward berikutnya (0-4)
   *  - currentStreakMonths : array monthKey yg sedang dalam streak saat ini
   *  - isRewardReady    : true jika streak baru saja mencapai tepat 4 (reward ke-n baru)
   */
  getDoctorRewardInfo(docId) {
    const qualifiedMonths = this.getDoctorQualifiedMonths(docId);
    const groups = this.getConsecutiveGroups(qualifiedMonths);

    let totalRewards = 0;
    groups.forEach(g => { totalRewards += Math.floor(g.length / this.STAMP_TOTAL); });

    if (groups.length === 0) {
      return { totalRewards: 0, currentStreak: 0, currentStreakMonths: [], isRewardReady: false };
    }

    const lastGroup = groups[groups.length - 1];
    const rem = lastGroup.length % this.STAMP_TOTAL;

    if (rem === 0) {
      // Tepat kelipatan 4 → reward baru saja tercapai, tampilkan 4/4
      return {
        totalRewards,
        currentStreak: this.STAMP_TOTAL,
        currentStreakMonths: lastGroup.slice(-this.STAMP_TOTAL),
        isRewardReady: true,
      };
    } else {
      return {
        totalRewards,
        currentStreak: rem,
        currentStreakMonths: lastGroup.slice(-rem),
        isRewardReady: false,
      };
    }
  },

  // ─────────────────────────────────────────────────────────────
  //  RENDER PAGE
  // ─────────────────────────────────────────────────────────────

  renderPage() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    let doctors = isManager ? DB.getDoctors() : DB.getDoctors().filter(d => d.salesId === user.id);
    const selectedMonth = this._selectedMonth;
    const monthLabel = new Date(`${selectedMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    return `
    <div class="fade-in">
      <div class="page-header" style="gap:14px;flex-wrap:wrap;align-items:flex-start;">
        <div class="page-header-left">
          <h1>⭐ Loyalty Program Dokter</h1>
          <p>${isManager ? 'Loyalty per dokter berdasarkan transaksi bulanan' : 'Loyalty dokter area Anda per bulan'}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;align-items:flex-end;max-width:440px;">
          <div style="font-size:12px;color:var(--text-muted);text-align:right;line-height:1.6;">
            Belanja bulanan total ≥ <strong>${DB.formatRupiah(this.STAMP_MIN)}</strong> = <strong>1 stamp</strong>.<br>
            <strong>4 bulan berturut-turut</strong> = Reward 🎁
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;align-items:center;width:100%;">
            <div style="display:flex;flex-direction:column;gap:6px;min-width:200px;">
              <span style="font-size:12px;color:var(--text-muted);">Bulan</span>
              <input type="month" id="month-filter" class="form-control" value="${selectedMonth}" onchange="Loyalty.filterByMonth(this.value)" />
            </div>
            <div class="filter-tabs">
              <button class="filter-tab active" id="tab-all"      onclick="Loyalty.filterDoctors('all')">Semua</button>
              <button class="filter-tab"         id="tab-approved" onclick="Loyalty.filterDoctors('approved')">Stamp Bulan Ini</button>
              <button class="filter-tab"         id="tab-pending"  onclick="Loyalty.filterDoctors('pending')">Belum Stamp</button>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="font-size:13px;color:var(--text-secondary);">
          Menampilkan <strong>${doctors.length}</strong> dokter • bulan <strong>${monthLabel}</strong>
        </div>
        <div class="search-input-wrap" style="max-width:320px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="search-input" id="doc-search" placeholder="Cari nama dokter atau klinik..." oninput="Loyalty.searchDoctors()" />
        </div>
      </div>

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
    return `<div class="doctor-list">${doctors.map((doc, i) => this.renderDoctorCard(doc, i + 1)).join('')}</div>`;
  },

  renderDoctorCard(doc, rank) {
    const salesUser    = DB.getUserById(doc.salesId);
    const selectedMonth = this._selectedMonth;
    const monthlyTotal  = this.getDoctorMonthTotalPurchase(doc.id, selectedMonth);
    const stampThisMonth = monthlyTotal >= this.STAMP_MIN;
    const progress      = Math.min((monthlyTotal / this.STAMP_MIN) * 100, 100);

    const rewardInfo   = this.getDoctorRewardInfo(doc.id);
    const { currentStreak, totalRewards, isRewardReady } = rewardInfo;

    // Streak badge
    let streakBadge = '';
    if (isRewardReady) {
      streakBadge = `<span class="loyalty-streak-badge reward">🎁 Reward ke-${totalRewards}!</span>`;
    } else if (currentStreak >= 2) {
      streakBadge = `<span class="loyalty-streak-badge streak">🔥 ${currentStreak} bulan berturut</span>`;
    } else if (currentStreak === 1) {
      streakBadge = `<span class="loyalty-streak-badge streak1">⭐ 1 bulan</span>`;
    }

    return `
    <div class="doctor-card" onclick="Loyalty.showDoctorDetail('${doc.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
          <div class="rank-num ${rank===1?'gold':rank===2?'silver':rank===3?'bronze':''}">${rank}</div>
          <div style="min-width:0;">
            <div style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              ${doc.name}
              <span class="badge ${stampThisMonth ? 'badge-success' : 'badge-warning'}" style="font-size:11px;">
                ${stampThisMonth ? '✓ Stamp bulan ini' : `Kurang ${DB.formatRupiah(this.STAMP_MIN - monthlyTotal)}`}
              </span>
              ${streakBadge}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${doc.clinic}</div>
            ${Auth.isManager() ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">Sales: ${salesUser ? salesUser.name : '–'}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:16px;font-weight:800;color:var(--primary-light);">${DB.formatRupiah(monthlyTotal)}</div>
          <div style="font-size:11px;color:var(--text-muted);">Bulan ini</div>
          ${totalRewards > 0 ? `<div style="font-size:11px;color:var(--warning);font-weight:600;margin-top:2px;">🎁 ${totalRewards}× reward</div>` : ''}
        </div>
      </div>

      <!-- Progress bar bulan ini -->
      <div style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:5px;">
          <span>Progress bulan ini</span>
          <span>${stampThisMonth ? 'Stamp diperoleh ✓' : DB.formatRupiah(monthlyTotal) + ' / ' + DB.formatRupiah(this.STAMP_MIN)}</span>
        </div>
        <div style="height:8px;border-radius:999px;background:rgba(15,23,42,0.08);overflow:hidden;">
          <div style="height:100%;width:${progress}%;background:${stampThisMonth ? 'var(--success)' : 'var(--warning)'};border-radius:999px;transition:width 0.5s ease;"></div>
        </div>
      </div>

      <!-- Mini streak track -->
      <div style="display:flex;gap:6px;margin-top:10px;align-items:center;">
        <span style="font-size:11px;color:var(--text-muted);margin-right:2px;">Streak:</span>
        ${Array.from({ length: this.STAMP_TOTAL }, (_, i) => `
          <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;
            ${i < currentStreak
              ? 'background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;box-shadow:0 2px 6px rgba(124,58,237,0.35);'
              : 'background:rgba(15,23,42,0.06);color:var(--text-muted);border:1.5px dashed rgba(124,58,237,0.2);'}">
            ${i < currentStreak ? '★' : i + 1}
          </div>`).join('')}
        <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">${currentStreak}/${this.STAMP_TOTAL} bulan</span>
        ${isRewardReady ? '<span style="font-size:11px;color:var(--warning);font-weight:700;margin-left:4px;">→ 🎁 REWARD!</span>' : ''}
      </div>
    </div>`;
  },

  // ─────────────────────────────────────────────────────────────
  //  FILTER & SEARCH
  // ─────────────────────────────────────────────────────────────

  filterDoctors(filter) {
    this._currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${filter}`)?.classList.add('active');
    this.refreshList();
  },

  searchDoctors() { this.refreshList(); },

  filterByMonth(month) {
    if (!month) return;
    this._selectedMonth = month;
    const el = document.getElementById('month-filter');
    if (el) el.value = month;
    this.refreshList();
  },

  refreshList() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    const search = (document.getElementById('doc-search')?.value || '').toLowerCase();
    let doctors = isManager ? DB.getDoctors() : DB.getDoctors().filter(d => d.salesId === user.id);

    if (this._currentFilter === 'approved') {
      doctors = doctors.filter(d => this.getDoctorMonthStamp(d.id, this._selectedMonth));
    } else if (this._currentFilter === 'pending') {
      doctors = doctors.filter(d => !this.getDoctorMonthStamp(d.id, this._selectedMonth));
    }

    if (search) {
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(search) ||
        d.clinic.toLowerCase().includes(search)
      );
    }

    doctors = doctors.sort((a, b) =>
      this.getDoctorMonthTotalPurchase(b.id, this._selectedMonth) -
      this.getDoctorMonthTotalPurchase(a.id, this._selectedMonth)
    );

    const container = document.getElementById('doctor-list-container');
    if (container) container.innerHTML = this.renderDoctorList(doctors);
  },

  // ─────────────────────────────────────────────────────────────
  //  MODAL — DETAIL DOKTER
  // ─────────────────────────────────────────────────────────────

  showDoctorDetail(id) {
    const doc = DB.getDoctorById(id);
    if (!doc) return;

    const salesUser  = DB.getUserById(doc.salesId);
    const rewardInfo = this.getDoctorRewardInfo(doc.id);
    const { totalRewards, currentStreak, currentStreakMonths, isRewardReady } = rewardInfo;
    const qualifiedMonths = this.getDoctorQualifiedMonths(doc.id);

    // Hitung total pembelian semua waktu
    const allTimePurchase = this.getDoctorTransactions(doc.id)
      .reduce((s, t) => s + (t.totalAmount || 0), 0);

    // Riwayat transaksi terkini (10 terakhir)
    const txs = DB.getTransactions()
      .filter(t => t.doctorId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // Hitung total per bulan untuk kolom stamp di tabel
    const monthTotalsCache = {};
    const getMonthTotal = (monthKey) => {
      if (monthTotalsCache[monthKey] === undefined) {
        monthTotalsCache[monthKey] = this.getDoctorMonthTotalPurchase(id, monthKey);
      }
      return monthTotalsCache[monthKey];
    };

    // ── Stamp Track Slots (4 slot, tiap slot = 1 bulan dalam streak) ──
    const stamps = Array.from({ length: this.STAMP_TOTAL }, (_, i) => {
      const filled = i < currentStreak;
      const mKey   = currentStreakMonths[i] || null;
      const mLabel = mKey ? this.monthLabel(mKey, 'short') : '';

      return `
        <div class="stamp-elegant ${filled ? 'stamp-filled' : 'stamp-empty'}">
          ${filled
            ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
          }
          <span class="stamp-num">${filled && mLabel ? mLabel : (i + 1)}</span>
        </div>`;
    }).join('');

    // ── Riwayat bulan qualified ──
    const qualMonthRows = qualifiedMonths.length === 0
      ? `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:12px 0;">Belum ada bulan qualified</div>`
      : qualifiedMonths.slice().reverse().slice(0, 6).map(m => {
          const total = getMonthTotal(m);
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:rgba(124,58,237,0.05);border-radius:var(--radius-sm);margin-bottom:4px;">
            <span style="font-size:12px;font-weight:600;">${new Date(m+'-01').toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</span>
            <span style="font-size:12px;color:var(--success);font-weight:700;">${DB.formatRupiah(total)} ✓</span>
          </div>`;
        }).join('');

    // ── Transaksi terkini ──
    const txRows = txs.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Belum ada transaksi</td></tr>`
      : txs.map(tx => {
          const mKey       = this.getMonthKey(tx.date);
          const mTotal     = getMonthTotal(mKey);
          const stampMonth = mTotal >= this.STAMP_MIN;
          return `<tr>
            <td>${DB.formatDate(tx.date)}</td>
            <td style="color:var(--primary-light);font-weight:600;">${DB.formatRupiah(tx.totalAmount)}</td>
            <td style="font-size:12px;color:var(--text-muted);">${DB.formatRupiah(mTotal)}</td>
            <td>${stampMonth
              ? '<span class="badge badge-success" style="font-size:10px;">⭐ Stamp</span>'
              : '<span style="color:var(--text-muted);font-size:12px;">–</span>'}</td>
          </tr>`;
        }).join('');

    App.openModal(`Profil Dokter — ${doc.name}`, `
      <div style="display:flex;flex-direction:column;gap:20px;">

        <!-- Header dokter -->
        <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--bg-input);border-radius:var(--radius-md);">
          <div class="user-avatar" style="width:54px;height:54px;font-size:18px;background:${isRewardReady ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--grad-primary)'}">
            ${DB.initials(doc.name)}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:17px;font-weight:800;">${doc.name}</div>
            <div style="font-size:13px;color:var(--text-muted);">${doc.clinic}</div>
            <div style="font-size:12px;color:var(--text-muted);">Area: ${doc.area} • Sales: ${salesUser ? salesUser.name : '–'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:26px;font-weight:900;color:var(--primary);">${currentStreak}<span style="font-size:14px;color:var(--text-muted);">/${this.STAMP_TOTAL}</span></div>
            <div style="font-size:11px;color:var(--text-muted);">Streak saat ini</div>
            ${totalRewards > 0 ? `<div style="font-size:11px;color:var(--warning);font-weight:700;margin-top:4px;">🎁 ${totalRewards}× reward</div>` : ''}
          </div>
        </div>

        <!-- Kartu Stamp (4 bulan berturut) -->
        <div class="stamp-card-elegant">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div>
              <div style="font-size:13px;font-weight:700;">Kartu Loyalty — Streak</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                ${currentStreak} dari ${this.STAMP_TOTAL} bulan berturut-turut
              </div>
            </div>
            ${totalRewards > 0 ? `<span class="badge badge-gold" style="padding:5px 12px;">🎁 ${totalRewards}× Reward</span>` : ''}
          </div>
          <div class="stamp-track">${stamps}</div>
          <div class="stamp-card-footer ${isRewardReady ? 'reward-ready' : ''}">
            ${isRewardReady
              ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/></svg>
                 <span style="font-weight:700;">Reward ke-${totalRewards} tercapai! 4 bulan berturut-turut.</span>`
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                 <span>Butuh <strong>${this.STAMP_TOTAL - currentStreak} bulan lagi berturut-turut</strong> untuk reward berikutnya</span>`
            }
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--text-muted);background:rgba(0,0,0,0.03);padding:8px 10px;border-radius:var(--radius-sm);">
            ℹ️ 1 stamp per bulan jika total belanja ≥ ${DB.formatRupiah(this.STAMP_MIN)}. Tidak berlaku kelipatan.
          </div>
        </div>

        <!-- Bulan Qualified -->
        <div>
          <div style="font-weight:700;margin-bottom:10px;font-size:13px;">Riwayat Bulan Qualified (≥ ${DB.formatRupiah(this.STAMP_MIN)})</div>
          ${qualMonthRows}
          ${qualifiedMonths.length > 6 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">+${qualifiedMonths.length-6} bulan lainnya</div>` : ''}
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div style="background:var(--bg-input);padding:12px;border-radius:var(--radius-md);">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Total Pembelian</div>
            <div style="font-size:15px;font-weight:800;color:var(--primary-light);">${DB.formatRupiah(allTimePurchase)}</div>
          </div>
          <div style="background:var(--bg-input);padding:12px;border-radius:var(--radius-md);">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Bulan Qualified</div>
            <div style="font-size:15px;font-weight:800;">${qualifiedMonths.length}</div>
          </div>
          <div style="background:var(--bg-input);padding:12px;border-radius:var(--radius-md);">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Total Reward</div>
            <div style="font-size:15px;font-weight:800;color:var(--warning);">${totalRewards}×</div>
          </div>
        </div>

        <!-- Transaksi terkini -->
        <div>
          <div style="font-weight:700;margin-bottom:10px;font-size:13px;">Riwayat Transaksi Terkini</div>
          <div class="table-wrapper">
            <table class="table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Total Trx</th>
                  <th>Total Bulan</th>
                  <th>Stamp</th>
                </tr>
              </thead>
              <tbody>${txRows}</tbody>
            </table>
          </div>
        </div>

      </div>
    `, 'modal-lg');
  },
};

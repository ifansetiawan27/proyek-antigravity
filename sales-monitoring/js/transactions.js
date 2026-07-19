/* ============================================================
   TRANSACTIONS MODULE (Simplified layout matching reference)
   ============================================================ */

const Transactions = {
  STAMP_MIN: 1500000,
  _editingId: null,
  _selectedMonth: new Date().toISOString().slice(0, 7),

  renderPage() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();

    if (!user) {
      return `<div class="empty-state" style="padding:32px 16px;">Tidak dapat memuat halaman Transaksi. Silakan login ulang.</div>`;
    }

    return `
    <div class="fade-in">
      <div class="transactions-grid" style="display: grid; grid-template-columns: ${isManager ? '1fr' : 'minmax(0, 360px) 1fr'}; gap: 24px; align-items: start;">
        
        <!-- LEFT PANEL: PENCATATAN PENJUALAN -->
        ${!isManager ? `
        <div class="card" style="position: sticky; top: calc(var(--topbar-h) + 12px); z-index: 10;">
          <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; margin-bottom: 16px;">
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary)"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              PENCATATAN PENJUALAN
            </h3>
          </div>
          
          <form id="tx-form" onsubmit="return false;">
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="font-size:11px; font-weight:600; color:var(--text-secondary);">TANGGAL</label>
              <input type="date" class="form-control" id="f-date" value="${DB.today()}" required max="${DB.today()}" />
            </div>

            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="font-size:11px; font-weight:600; color:var(--text-secondary);">NAMA DOKTER / INSTANSI RS</label>
              <input type="text" class="form-control" id="f-doctor" placeholder="Masukkan nama dokter atau instansi RS" required />
            </div>

            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="font-size:11px; font-weight:600; color:var(--text-secondary);">ALKES / OBAT / PAKET</label>
              <textarea class="form-control" id="f-items-text" rows="3" placeholder="Paracetamol Box, Dental Unit Pro-8" required></textarea>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
              <label class="form-label" style="font-size:11px; font-weight:600; color:var(--text-secondary);">TOTAL BELANJA (RP)</label>
              <input type="text" class="form-control" id="f-total-amount" placeholder="1.500.000" required oninput="Transactions.onTotalAmountInput(this)" />
              <div id="f-stamp-preview" style="margin-top: 8px; font-size: 11px;"></div>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
              <button type="button" id="btn-save-tx" class="btn btn-success btn-full" onclick="Transactions.saveTransaction()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Simpan Transaksi
              </button>
              <button type="button" id="btn-cancel-edit" class="btn btn-ghost btn-full hidden" onclick="Transactions.resetForm()">
                Batal Edit
              </button>
            </div>
          </form>
        </div>
        ` : ''}

        <!-- RIGHT PANEL: ANALYTICS + LOGBOOK -->
        <div style="display:flex; flex-direction:column; gap:24px; min-width:0;">
          
          <!-- TOP: PEMBELIAN TERBANYAK PER DOKTER -->
          <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
              <h3 class="card-title" style="display:flex; align-items:center; gap:8px; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">
                <span style="color:var(--warning)">★</span> PEMBELIAN TERBANYAK PER DOKTER
              </h3>
              <span class="badge badge-primary" style="font-size:12px; padding: 6px 12px;" id="grand-total-badge">
                Grand Total: ${DB.formatRupiah(this.getGrandTotal(user, isManager, this._selectedMonth))}
              </span>
            </div>
            
            <div style="display:flex; gap:16px; overflow-x:auto; padding-bottom:8px;" id="top-doctors-list">
              ${this.renderTopDoctors(user, isManager)}
            </div>
          </div>

          <!-- BOTTOM: LOGBOOK TRANSAKSI TERDAFTAR -->
          <div class="card">
            <div class="card-header" style="margin-bottom:16px;">
              <h3 class="card-title" style="display:flex; align-items:center; gap:8px; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">
                <span style="color:var(--primary)">📂</span> LOGBOOK TRANSAKSI TERDAFTAR
              </h3>
            </div>

            <div class="filter-row" style="margin-bottom: 20px;">
              <div>
                <label class="form-label" style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:8px; display:block;">CARI NAMA DOKTER / BARANG</label>
                <div class="search-input-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" class="search-input" id="tx-search" placeholder="Ketik kata kunci pencarian..." oninput="Transactions.filterTable()" />
                </div>
              </div>
              <div class="filter-month">
                <label class="form-label" style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:8px; display:block;">FILTER BULAN</label>
                <input type="month" class="form-control" id="tx-month" value="${this._selectedMonth}" onchange="Transactions.filterTable()" />
              </div>
            </div>

            <div id="tx-table-container" class="tx-table">
              ${this.renderTable(user, isManager)}
            </div>
          </div>

        </div>
      </div>
    </div>`;
  },

  getGrandTotal(user, isManager, month = this._selectedMonth) {
    let txs = isManager ? DB.getTransactions() : DB.getTransactionsBySales(user.id);
    if (month) {
      txs = txs.filter(tx => tx.date.slice(0, 7) === month);
    }
    return txs.reduce((sum, tx) => sum + tx.totalAmount, 0);
  },

  renderTopDoctors(user, isManager) {
    const selectedMonth = this._selectedMonth;

    let txs = isManager ? DB.getTransactions() : DB.getTransactionsBySales(user.id);
    if (selectedMonth) {
      txs = txs.filter(tx => tx.date && tx.date.slice(0, 7) === selectedMonth);
    }

    const docPurchase = {};

    txs.forEach(tx => {
      const key = tx.doctorId || 'Dokter Tidak Dikenal';
      if (!docPurchase[key]) docPurchase[key] = 0;
      docPurchase[key] += Number(tx.totalAmount) || 0;
    });

    const sortedDocs = Object.keys(docPurchase)
      .map(id => ({
        id,
        amount: docPurchase[id],
        doc: DB.getDoctorById(id)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    if (sortedDocs.length === 0) {
      return `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Belum ada riwayat pembelian.</div>`;
    }

    return sortedDocs.map(item => {
      const doctorName = item.doc ? item.doc.name : item.id;
      const doctorClinic = item.doc ? item.doc.clinic : '';
      const isRewardReady = item.doc ? item.doc.stamps >= 4 : false;
      const rewardLabel = item.doc ? (isRewardReady ? '🎁 Reward Ready' : `⭐ ${item.doc.stamps % 4}/4 Stamp`) : '–';
      return `
      <div style="background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;min-width:200px;flex:1;display:flex;align-items:center;gap:12px;">
        <div class="user-avatar-sm" style="background:rgba(16,185,129,0.1);color:var(--primary);flex-shrink:0;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="min-width:0;flex:1;">
          <div style="font-weight:700;font-size:11px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;" title="${doctorName}">${doctorName}</div>
          <div style="font-weight:800;font-size:14px;color:var(--primary-dark);margin:3px 0;">${DB.formatRupiah(item.amount)}</div>
          <span class="badge ${item.doc && isRewardReady ? 'badge-gold' : 'badge-primary'}" style="font-size:9px;padding:2px 8px;border-radius:4px;">
            ${rewardLabel}
          </span>
          ${doctorClinic ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${doctorClinic}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  renderTable(user, isManager) {
    const selectedMonth = this._selectedMonth;
    let txs = isManager ? DB.getTransactions() : DB.getTransactionsBySales(user.id);
    if (selectedMonth) {
      txs = txs.filter(tx => tx.date && tx.date.slice(0, 7) === selectedMonth);
    }
    txs = txs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (txs.length === 0) {
      return `<div class="empty-state" style="padding:32px 16px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size:13px;">Belum ada logbook transaksi terdaftar.</p>
      </div>`;
    }

    const rows = txs.map(tx => {
      const doc = DB.getDoctorById(tx.doctorId);
      const doctorName = doc ? doc.name : tx.doctorId || '–';
      const doctorClinic = doc ? doc.clinic : '';
      const salesUser = DB.getUserById(tx.salesId);
      const itemsText = Array.isArray(tx.items) ? tx.items.map(i => i.productName).join(', ') : (tx.notes || '–');

      return `
      <tr>
        <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">${tx.date}</td>
        <td>
          <div style="font-weight:700;font-size:13px;color:var(--text-primary);">${doctorName}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${doctorClinic}</div>
          ${isManager ? `<div style="font-size:11px;color:var(--primary-light);margin-top:4px;">Sales: ${salesUser ? salesUser.name : '–'}</div>` : ''}
        </td>
        <td style="color:var(--text-secondary);font-size:13px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itemsText}">
          ${itemsText}
        </td>
        <td>
          <div style="font-weight:800;color:var(--text-primary);font-size:14px;">${DB.formatRupiah(tx.totalAmount)}</div>
          ${tx.stampGiven > 0 ? '<span class="badge badge-gold" style="font-size:9px;padding:2px 6px;margin-top:4px;display:inline-block;">⭐ +1 Stamp</span>' : ''}
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="btn btn-ghost btn-sm btn-icon" title="Detail" onclick="Transactions.showDetail('${tx.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            ${!isManager ? `
            <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="Transactions.editTransaction('${tx.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" title="Hapus" onclick="Transactions.confirmDelete('${tx.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    // ── Kartu mobile (ditampilkan saat layar kecil / mobile-preview) ──
    const mobileCards = txs.map(tx => {
      const doc        = DB.getDoctorById(tx.doctorId);
      const doctorName = doc ? doc.name : tx.doctorId || '–';
      const doctorClinic = doc ? doc.clinic : '';
      const salesUser  = DB.getUserById(tx.salesId);
      const itemsText  = Array.isArray(tx.items) ? tx.items.map(i => i.productName).join(', ') : (tx.notes || '–');
      return `
      <div class="tx-card">
        <div class="tx-card-top">
          <span class="tx-card-date">${tx.date}</span>
          <span class="tx-card-amount">${DB.formatRupiah(tx.totalAmount)}</span>
        </div>
        ${tx.stampGiven > 0 ? '<span class="badge badge-gold" style="font-size:9px;padding:2px 6px;margin-bottom:6px;display:inline-block;">⭐ +1 Stamp</span>' : ''}
        <div class="tx-card-doctor">${doctorName}</div>
        ${doctorClinic ? `<div class="tx-card-sub">${doctorClinic}</div>` : ''}
        ${isManager && salesUser ? `<div class="tx-card-sales">Sales: ${salesUser.name}</div>` : ''}
        <div class="tx-card-items">${itemsText}</div>
        <div class="tx-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="Transactions.showDetail('${tx.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Detail
          </button>
          ${!isManager ? `
          <button class="btn btn-secondary btn-sm" onclick="Transactions.editTransaction('${tx.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="Transactions.confirmDelete('${tx.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Hapus
          </button>` : ''}
        </div>
      </div>`;
    }).join('');

    return `
    <div class="table-wrapper">
      <table class="table" id="tx-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Dokter</th>
            <th>Barang / Obat</th>
            <th>Nilai Belanja</th>
            <th style="width: 100px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="tx-tbody">${rows}</tbody>
      </table>
    </div>
    <div class="tx-mobile-cards">${mobileCards}</div>`;
  },

  filterTable() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    const search = (document.getElementById('tx-search')?.value || '').toLowerCase();
    const selectedMonth = (document.getElementById('tx-month')?.value || this._selectedMonth);
    this._selectedMonth = selectedMonth;

    let txs = isManager ? DB.getTransactions() : DB.getTransactionsBySales(user.id);
    if (selectedMonth) {
      txs = txs.filter(t => t.date && t.date.slice(0, 7) === selectedMonth);
    }

    if (search) {
      txs = txs.filter(t => {
        const doc = DB.getDoctorById(t.doctorId);
        const docName = doc ? doc.name.toLowerCase() : '';
        const clinic = doc ? doc.clinic.toLowerCase() : '';
        const items = Array.isArray(t.items) ? t.items.map(i => (i.productName || '').toLowerCase()).join(' ') : '';
        return docName.includes(search) || clinic.includes(search) || items.includes(search) || (t.notes || '').toLowerCase().includes(search);
      });
    }

    const grandBadge = document.getElementById('grand-total-badge');
    if (grandBadge) {
      grandBadge.textContent = 'Grand Total: ' + DB.formatRupiah(this.getGrandTotal(user, isManager, selectedMonth));
    }

    const topDocList = document.getElementById('top-doctors-list');
    if (topDocList) {
      topDocList.innerHTML = this.renderTopDoctors(user, isManager);
    }

    const tbody = document.getElementById('tx-tbody');
    if (!tbody) return;

    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">Tidak ada transaksi yang cocok</td></tr>`;
      return;
    }

    tbody.innerHTML = txs.map(tx => {
      const doc = DB.getDoctorById(tx.doctorId);
      const salesUser = DB.getUserById(tx.salesId);
      const itemsText = Array.isArray(tx.items) ? tx.items.map(i => i.productName).join(', ') : (tx.notes || '–');

      let actionButtons = `<button class="btn btn-ghost btn-sm btn-icon" onclick="Transactions.showDetail('${tx.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
      if (!isManager) {
        actionButtons += ` <button class="btn btn-secondary btn-sm btn-icon" onclick="Transactions.editTransaction('${tx.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button> <button class="btn btn-danger btn-sm btn-icon" onclick="Transactions.confirmDelete('${tx.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>`;
      }

      return `
      <tr>
        <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">${tx.date}</td>
        <td>
          <div style="font-weight:700;font-size:13px;color:var(--text-primary);">${doc ? doc.name : '–'}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${doc ? doc.clinic : ''}</div>
          ${!isManager ? `<div style="font-size:11px;color:var(--primary-light);margin-top:4px;">Sales: ${salesUser ? salesUser.name : '–'}</div>` : ''}
        </td>
        <td style="color:var(--text-secondary);font-size:13px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itemsText}">${itemsText}</td>
        <td>
          <div style="font-weight:800;color:var(--text-primary);font-size:14px;">${DB.formatRupiah(tx.totalAmount)}</div>
          ${tx.stampGiven > 0 ? '<span class="badge badge-gold" style="font-size:9px;padding:2px 6px;margin-top:4px;display:inline-block;">⭐ +1 Stamp</span>' : ''}
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;">${actionButtons}</div>
        </td>
      </tr>`;
    }).join('');
  },

  openNewForm() {
    this.resetForm();
    document.getElementById('tx-form')?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('f-doctor')?.focus();
  },

  openEditForm(id) {
    this.editTransaction(id);
  },

  formatAmountValue(amount) {
    const value = Number(amount) || 0;
    return value ? value.toLocaleString('id-ID') : '';
  },

  parseFormattedAmount(value) {
    return (value || '').toString().replace(/\D/g, '');
  },

  onTotalAmountInput(el) {
    if (!el) return;
    const raw = this.parseFormattedAmount(el.value);
    el.value = raw ? Number(raw).toLocaleString('id-ID') : '';
    this.onTotalAmountChange(Number(raw));
  },

  onTotalAmountChange(amount) {
    const value = Number(amount) || 0;
    const preview = document.getElementById('f-stamp-preview');
    if (!preview) return;

    if (value >= this.STAMP_MIN) {
      preview.innerHTML = `<span style="color:var(--primary); font-weight:600;">⭐ Memberikan +1 Stamp (Batas min. ${DB.formatRupiah(this.STAMP_MIN)})</span>`;
    } else {
      const diff = this.STAMP_MIN - value;
      preview.innerHTML = `<span style="color:var(--text-muted);">Kurang ${DB.formatRupiah(diff)} lagi untuk stamp ⭐</span>`;
    }
  },

  editTransaction(id) {
    const tx = DB.getTransactionById(id);
    if (!tx) return;

    this._editingId = tx.id;

    const fDate = document.getElementById('f-date');
    const fDoctor = document.getElementById('f-doctor');
    const fItems = document.getElementById('f-items-text');
    const fTotal = document.getElementById('f-total-amount');
    const btnSave = document.getElementById('btn-save-tx');
    const btnCancel = document.getElementById('btn-cancel-edit');

    const doc = DB.getDoctorById(tx.doctorId);

    if (fDate) fDate.value = tx.date;
    if (fDoctor) fDoctor.value = doc ? doc.name : tx.doctorId;
    if (fItems) fItems.value = tx.items.map(i => i.productName).join(', ') || tx.notes || '';
    if (fTotal) {
      fTotal.value = this.formatAmountValue(tx.totalAmount);
      this.onTotalAmountChange(tx.totalAmount);
    }

    if (btnSave) {
      btnSave.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Perbarui Transaksi`;
      btnSave.className = "btn btn-primary btn-full";
    }

    if (btnCancel) btnCancel.classList.remove('hidden');

    document.getElementById('tx-form')?.scrollIntoView({ behavior: 'smooth' });
  },

  resetForm() {
    this._editingId = null;
    const form = document.getElementById('tx-form');
    if (form) form.reset();

    const fDate = document.getElementById('f-date');
    if (fDate) fDate.value = DB.today();

    const preview = document.getElementById('f-stamp-preview');
    if (preview) preview.innerHTML = '';

    const btnSave = document.getElementById('btn-save-tx');
    const btnCancel = document.getElementById('btn-cancel-edit');

    if (btnSave) {
      btnSave.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan Transaksi`;
      btnSave.className = "btn btn-success btn-full";
    }

    if (btnCancel) btnCancel.classList.add('hidden');
  },

  saveTransaction() {
    const doctorInput = document.getElementById('f-doctor').value.trim();
    const date = document.getElementById('f-date').value;
    const itemsText = document.getElementById('f-items-text').value.trim();
    const amountVal = document.getElementById('f-total-amount').value;
    const rawAmount = (amountVal || '').replace(/\D/g, '');

    if (!doctorInput) { App.Toast.show('Masukkan nama dokter / instansi RS', 'warning'); return; }
    if (!date) { App.Toast.show('Pilih tanggal transaksi', 'warning'); return; }
    if (!itemsText) { App.Toast.show('Masukkan Alkes / Obat / Paket', 'warning'); return; }
    if (!rawAmount) { App.Toast.show('Masukkan total belanja', 'warning'); return; }

    const totalAmount = parseFloat(rawAmount) || 0;
    const stampGiven = totalAmount >= this.STAMP_MIN ? 1 : 0;
    const user = Auth.getCurrentUser();

    let doctor = DB.getDoctors().find(d => d.id === doctorInput || d.name.toLowerCase() === doctorInput.toLowerCase());
    let doctorId = doctor ? doctor.id : DB.genId();

    if (!doctor) {
      DB.addDoctor({
        id: doctorId,
        name: doctorInput,
        clinic: '',
        area: user.area || '',
        salesId: user.id,
        stamps: 0,
        totalPurchase: 0,
      });
      doctor = DB.getDoctorById(doctorId);
    }

    // Map items list
    const items = [{
      productId: 'p16',
      productName: itemsText,
      qty: 1,
      price: totalAmount,
      discount: 0
    }];

    if (this._editingId) {
      const oldTx = DB.getTransactionById(this._editingId);
      const oldStamp = oldTx ? oldTx.stampGiven : 0;
      const oldAmount = oldTx ? oldTx.totalAmount : 0;
      const stampDiff = stampGiven - oldStamp;
      const amountDiff = totalAmount - oldAmount;

      DB.updateTransaction(this._editingId, {
        doctorId, date, items, totalAmount, stampGiven, notes: itemsText
      });

      const doc = DB.getDoctorById(doctorId);
      if (doc) {
        DB.updateDoctor(doctorId, {
          stamps: Math.max(0, doc.stamps + stampDiff),
          totalPurchase: Math.max(0, doc.totalPurchase + amountDiff)
        });
      }

      App.Toast.show('Transaksi berhasil diperbarui', 'success');
      this.resetForm();
    } else {
      const tx = {
        id: DB.genId(),
        salesId: user.id,
        doctorId, date,
        items,
        totalAmount, stampGiven,
        notes: itemsText,
        createdAt: new Date().toISOString(),
      };
      DB.addTransaction(tx);

      const doc = DB.getDoctorById(doctorId);
      if (doc) {
        DB.updateDoctor(doctorId, {
          stamps: doc.stamps + stampGiven,
          totalPurchase: doc.totalPurchase + totalAmount
        });
      }

      App.Toast.show('Transaksi berhasil disimpan', 'success');
      this.resetForm();
    }

    this.refreshPageContent();
  },

  refreshPageContent() {
    const user = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    
    const grandBadge = document.getElementById('grand-total-badge');
    if (grandBadge) grandBadge.textContent = 'Grand Total: ' + DB.formatRupiah(this.getGrandTotal(user, isManager, this._selectedMonth));

    const topDocList = document.getElementById('top-doctors-list');
    if (topDocList) topDocList.innerHTML = this.renderTopDoctors(user, isManager);

    const tableContainer = document.getElementById('tx-table-container');
    if (tableContainer) tableContainer.innerHTML = this.renderTable(user, isManager);

    const txMonth = document.getElementById('tx-month');
    if (txMonth) txMonth.value = this._selectedMonth;
  },

  showDetail(id) {
    const tx = DB.getTransactionById(id);
    if (!tx) return;
    const doc = DB.getDoctorById(tx.doctorId);
    const doctorName = doc ? doc.name : tx.doctorId;
    const doctorClinic = doc ? doc.clinic : '';
    const salesUser = DB.getUserById(tx.salesId);
    const itemsText = tx.items.map(i => i.productName).join(', ') || tx.notes || '–';

    App.openModal('Detail Transaksi', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">DOKTER</div>
            <div style="font-weight:700;color:var(--text-primary);">${doctorName}</div>
            <div style="font-size:12px;color:var(--text-muted);">${doctorClinic}</div>
          </div>
          <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">SALES & TANGGAL</div>
            <div style="font-weight:700;color:var(--text-primary);">${salesUser ? salesUser.name : '–'}</div>
            <div style="font-size:12px;color:var(--text-muted);">${tx.date}</div>
          </div>
        </div>

        <div style="background:var(--bg-input);padding:16px;border-radius:var(--radius-md);">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">ALKES / OBAT / PAKET</div>
          <div style="font-size:14px;font-weight:500;color:var(--text-primary);line-height:1.5;">${itemsText}</div>
        </div>

        <div class="tx-summary" style="margin-top:0;">
          <div class="tx-summary-row total">
            <span>Total Tagihan</span>
            <span class="amount" style="color:var(--primary-dark); font-weight:800; font-size:18px;">${DB.formatRupiah(tx.totalAmount)}</span>
          </div>
          <div style="margin-top:10px;text-align:center;font-size:13px;">
            ${tx.stampGiven > 0 ? `<span style="color:var(--primary); font-weight:600;">⭐ Memberikan +1 Stamp untuk dokter</span>` : '<span style="color:var(--text-muted);">Tidak ada stamp (di bawah minimum)</span>'}
          </div>
        </div>
      </div>
    `, 'modal-md');
  },

  confirmDelete(id) {
    App.openModal('Konfirmasi Hapus', `
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:48px;margin-bottom:16px;">🗑️</div>
        <p style="color:var(--text-secondary);margin-bottom:24px;">Yakin ingin menghapus transaksi ini?<br>Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi stamp dokter.</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn btn-ghost" onclick="App.closeModal()">Batal</button>
          <button class="btn btn-danger" onclick="Transactions.deleteTransaction('${id}')">Hapus</button>
        </div>
      </div>
    `);
  },

  deleteTransaction(id) {
    const tx = DB.getTransactionById(id);
    if (tx) {
      if (tx.stampGiven > 0) {
        const doc = DB.getDoctorById(tx.doctorId);
        if (doc) DB.updateDoctor(tx.doctorId, {
          stamps: Math.max(0, doc.stamps - tx.stampGiven),
          totalPurchase: Math.max(0, doc.totalPurchase - tx.totalAmount),
        });
      } else {
        const doc = DB.getDoctorById(tx.doctorId);
        if (doc) DB.updateDoctor(tx.doctorId, {
          totalPurchase: Math.max(0, doc.totalPurchase - tx.totalAmount),
        });
      }
    }
    DB.deleteTransaction(id);
    App.closeModal();
    App.Toast.show('Transaksi berhasil dihapus', 'success');
    this.refreshPageContent();
  },
};

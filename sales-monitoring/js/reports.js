/* ============================================================
   Reports — Pipeline Equipment & Overview
   
   Status per bulan (statusHistory):
   - Setiap item menyimpan riwayat status per bulan
   - Mengubah status mencatat entri baru untuk bulan yang dipilih
   - Filter bulan menampilkan item yang aktif di bulan tersebut
   ============================================================ */

const Reports = {
  STATUSES: ['Demo unit', 'Perkenalan', 'Negosiasi', 'Submit Quotation', 'Deal', 'Lost'],

  STATUS_CONFIG: {
    'Demo unit':        { color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.25)' },
    'Perkenalan':       { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.25)' },
    'Negosiasi':        { color: '#d97706', bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.25)' },
    'Submit Quotation': { color: '#0d9488', bg: 'rgba(13,148,136,0.1)',  border: 'rgba(13,148,136,0.25)' },
    'Deal':             { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.25)' },
    'Lost':             { color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.25)' },
  },

  _activeTab:      'pipeline',
  _filterStatus:   'all',
  _searchQuery:    '',
  _editingId:      null,
  _editingMonth:   null,
  _pipelineMonth:  new Date().toISOString().slice(0, 7),   // filter bulan tabel pipeline

  // ================================================================
  //  STATUS HISTORY HELPERS
  // ================================================================

  /** Pastikan item memiliki statusHistory; generate dari field lama jika belum ada */
  getItemNormalized(item) {
    if (item.statusHistory && item.statusHistory.length > 0) return item;
    const month = (item.createdAt || DB.today()).slice(0, 7);
    return {
      ...item,
      statusHistory: [{
        month,
        status: item.status || 'Perkenalan',
        notes:  item.notes  || '',
        updatedAt: item.createdAt || DB.today(),
      }],
    };
  },

  /** Ambil entri status untuk bulan tertentu, fallback ke entri terdekat sebelumnya */
  getItemForMonth(item, month) {
    const norm = this.getItemNormalized(item);
    const exact = norm.statusHistory.find(h => h.month === month);
    if (exact) return exact;
    // Fallback: entri terakhir sebelum/sama dengan month
    const past = norm.statusHistory
      .filter(h => h.month <= month)
      .sort((a, b) => b.month.localeCompare(a.month));
    return past[0] || null;
  },

  /** Cek apakah item memiliki aktivitas tepat di bulan ini */
  itemActiveInMonth(item, month) {
    const norm = this.getItemNormalized(item);
    return norm.statusHistory.some(h => h.month === month);
  },

  /** Tambah / update entri statusHistory untuk bulan tertentu, lalu simpan */
  saveStatusForMonth(itemId, month, status, notes) {
    const item = DB.getPipelineById(itemId);
    if (!item) return;
    const norm = this.getItemNormalized(item);
    const hist = [...norm.statusHistory];
    const idx  = hist.findIndex(h => h.month === month);
    const entry = { month, status, notes: notes !== undefined ? notes : (hist[idx]?.notes || ''), updatedAt: DB.today() };
    if (idx >= 0) hist[idx] = entry; else hist.push(entry);
    hist.sort((a, b) => a.month.localeCompare(b.month));
    // status field = status terbaru (bulan terbesar)
    const latest = hist[hist.length - 1];
    DB.updatePipeline(itemId, { statusHistory: hist, status: latest.status, notes: latest.notes });
  },

  // ================================================================
  //  RENDER PAGE
  // ================================================================
  renderPage() {
    const user      = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    const pipeline  = isManager ? DB.getPipeline() : DB.getPipelineBySales(user.id);

    const totalValue = pipeline.reduce((s, p) => s + (p.estimatedValue || 0), 0);
    const dealCount  = pipeline.filter(p => p.status === 'Deal').length;
    const negoCount  = pipeline.filter(p => p.status === 'Negosiasi').length;
    const lostCount  = pipeline.filter(p => p.status === 'Lost').length;
    const dealValue  = pipeline.filter(p => p.status === 'Deal').reduce((s, p) => s + (p.estimatedValue || 0), 0);

    return `
    <div class="fade-in">

      <!-- Page Header -->
      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-header-left">
          <h1 style="font-size:22px;font-weight:800;">Reports</h1>
          <p style="color:var(--text-muted);font-size:13px;margin-top:3px;">${pipeline.length} item pipeline · ${dealCount} deal closed</p>
        </div>
        ${!isManager ? `
        <button class="btn btn-summary-ai" onclick="Reports.openForm()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Pipeline
        </button>` : ''}
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-icon info"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
          <div class="stat-value">${pipeline.length}</div>
          <div class="stat-label">Total Pipeline</div>
          <div class="stat-change up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>${DB.formatRupiah(totalValue)} estimasi</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="stat-value">${dealCount}</div>
          <div class="stat-label">Deal Closed</div>
          <div class="stat-change up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>${DB.formatRupiah(dealValue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
          <div class="stat-value">${negoCount}</div>
          <div class="stat-label">Negosiasi</div>
          <div class="stat-change" style="color:var(--text-muted);">Sedang berjalan</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(220,38,38,0.1);color:#dc2626;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          <div class="stat-value">${lostCount}</div>
          <div class="stat-label">Lost</div>
          <div class="stat-change down">Perlu follow-up</div>
        </div>
      </div>

      <!-- Sub-tabs -->
      <div class="reports-tabs">
        <button class="reports-tab ${this._activeTab === 'overview' ? 'active' : ''}" onclick="Reports.switchTab('overview')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          Overview
        </button>
        <button class="reports-tab ${this._activeTab === 'pipeline' ? 'active' : ''}" onclick="Reports.switchTab('pipeline')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Pipeline Equipment
        </button>
      </div>

      <!-- Tab Content -->
      <div id="reports-tab-content">
        ${this._activeTab === 'pipeline' ? this.renderPipelineTab() : this.renderOverviewTab()}
      </div>
    </div>`;
  },

  // ================================================================
  //  OVERVIEW TAB
  // ================================================================
  renderOverviewTab() {
    const user      = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    const pipeline  = isManager ? DB.getPipeline() : DB.getPipelineBySales(user.id);

    const byStatus = {};
    this.STATUSES.forEach(s => { byStatus[s] = { count: 0, value: 0 }; });
    pipeline.forEach(p => {
      if (byStatus[p.status]) {
        byStatus[p.status].count++;
        byStatus[p.status].value += p.estimatedValue || 0;
      }
    });
    const maxCount = Math.max(...Object.values(byStatus).map(s => s.count), 1);

    return `
    <div class="card" style="margin-top:0;">
      <div class="card-header">
        <div>
          <div class="card-title">Status Pipeline Overview</div>
          <div class="card-subtitle">Distribusi item pipeline berdasarkan status terbaru</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${this.STATUSES.map(status => {
          const cfg = this.STATUS_CONFIG[status];
          const d   = byStatus[status];
          const pct = Math.round((d.count / maxCount) * 100);
          return `
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:150px;flex-shrink:0;">
              <span class="pipeline-status-badge" style="color:${cfg.color};background:${cfg.bg};border:1px solid ${cfg.border};">${status}</span>
            </div>
            <div style="flex:1;height:8px;background:rgba(0,0,0,0.06);border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${cfg.color};border-radius:999px;transition:width 0.6s ease;"></div>
            </div>
            <div style="width:28px;text-align:right;font-size:13px;font-weight:700;">${d.count}</div>
            <div style="width:140px;text-align:right;font-size:12px;color:var(--text-muted);">${DB.formatRupiah(d.value)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  // ================================================================
  //  PIPELINE TAB
  // ================================================================
  renderPipelineTab() {
    const monthLabel = new Date(this._pipelineMonth + '-01')
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    return `
    <div class="card" style="padding:0;overflow:hidden;">
      <!-- Toolbar -->
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap;">

        <!-- Month filter -->
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="month" class="form-control" id="pipeline-month-filter"
            value="${this._pipelineMonth}"
            style="width:170px;padding:7px 10px;font-size:13px;"
            onchange="Reports.onFilterMonth(this.value)" />
        </div>

        <!-- Search -->
        <div class="search-input-wrap" style="flex:1;min-width:180px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="search-input" id="pipeline-search"
            placeholder="Cari dokter, klinik, atau nama barang..."
            value="${this._searchQuery}"
            oninput="Reports.onSearch(this.value)" />
        </div>

        <!-- Status filter -->
        <select class="form-control" id="pipeline-status-filter"
          style="width:auto;min-width:155px;padding:8px 12px;font-size:13px;"
          onchange="Reports.onFilterStatus(this.value)">
          <option value="all" ${this._filterStatus === 'all' ? 'selected' : ''}>Semua Status</option>
          ${this.STATUSES.map(s => `<option value="${s}" ${this._filterStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>

      <!-- Month label -->
      <div style="padding:10px 20px 0;font-size:12px;color:var(--text-muted);">
        Menampilkan pipeline aktif bulan <strong style="color:var(--text-primary);">${monthLabel}</strong>
        <span style="margin-left:8px;font-size:11px;color:var(--primary);">
          (ubah status di bawah untuk merekam aktivitas bulan ini)
        </span>
      </div>

      <!-- Table -->
      <div class="table-wrapper" id="pipeline-table-wrapper" style="margin-top:8px;">
        ${this.renderPipelineTable()}
      </div>
    </div>`;
  },

  renderPipelineTable() {
    const user      = Auth.getCurrentUser();
    const isManager = Auth.isManager();
    let   items     = isManager ? DB.getPipeline() : DB.getPipelineBySales(user.id);
    const month     = this._pipelineMonth;

    // Filter: hanya tampilkan item yang punya aktivitas di bulan ini
    items = items.filter(item => this.itemActiveInMonth(item, month));

    // Filter status (berdasarkan status di bulan terpilih)
    if (this._filterStatus !== 'all') {
      items = items.filter(item => {
        const h = this.getItemForMonth(item, month);
        return h && h.status === this._filterStatus;
      });
    }

    // Filter pencarian
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      items = items.filter(p =>
        p.doctorName.toLowerCase().includes(q) ||
        p.clinicName.toLowerCase().includes(q) ||
        p.itemName.toLowerCase().includes(q)
      );
    }

    items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (items.length === 0) {
      return `<div class="empty-state" style="padding:48px 24px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 12px;opacity:0.3;display:block;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <p style="margin-bottom:8px;">Tidak ada pipeline di bulan ini</p>
        <p style="font-size:12px;color:var(--text-muted);">Tambah pipeline baru atau pilih bulan lain</p>
      </div>`;
    }

    const rows = items.map(item => {
      const hist      = this.getItemForMonth(item, month);
      const status    = hist ? hist.status : (item.status || '–');
      const notes     = hist ? (hist.notes || '–') : (item.notes || '–');
      const cfg       = this.STATUS_CONFIG[status] || { color:'#64748b', bg:'rgba(100,116,139,0.1)', border:'rgba(100,116,139,0.25)' };
      const salesUser = DB.getUserById(item.salesId);
      const canEdit   = isManager || item.salesId === user.id;

      // Status dropdown options
      const statusOpts = this.STATUSES.map(s =>
        `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`
      ).join('');

      return `
      <tr id="pl-row-${item.id}">
        <td>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${item.doctorName}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${item.clinicName}</div>
        </td>
        <td style="font-size:13px;font-weight:500;max-width:200px;">
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${item.itemName}">${item.itemName}</div>
        </td>
        <td style="font-size:13px;font-weight:700;color:var(--primary);white-space:nowrap;">
          ${this.formatEstimasi(item.estimatedValue)}
        </td>
        <td style="min-width:155px;">
          ${canEdit
            ? `<select class="pipeline-status-select" data-id="${item.id}" data-month="${month}"
                style="color:${cfg.color};background:${cfg.bg};border:1px solid ${cfg.border};"
                onchange="Reports.onStatusChange('${item.id}', '${month}', this.value)">
                ${statusOpts}
               </select>`
            : `<span class="pipeline-status-badge" style="color:${cfg.color};background:${cfg.bg};border:1px solid ${cfg.border};">${status}</span>`
          }
        </td>
        <td style="max-width:200px;">
          <div style="word-break:break-word;white-space:normal;font-weight:600;font-size:12px;line-height:1.5;color:var(--text-secondary);">${notes}</div>
        </td>
        <td style="white-space:nowrap;">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:${canEdit ? '6px' : '0'};">${salesUser ? salesUser.name : '–'}</div>
          ${canEdit ? `
          <div style="display:flex;gap:5px;">
            <button class="btn btn-secondary btn-sm" style="padding:4px 10px;font-size:11px;gap:4px;" title="Edit" onclick="Reports.openForm('${item.id}', '${month}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              Edit
            </button>
            <button class="btn btn-danger btn-sm" style="padding:4px 10px;font-size:11px;gap:4px;" title="Hapus" onclick="Reports.confirmDelete('${item.id}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
              Hapus
            </button>
          </div>` : ''}
        </td>
      </tr>`;
    }).join('');

    return `
    <table class="table pipeline-table">
      <thead>
        <tr>
          <th>Dokter / Klinik</th>
          <th>Nama Barang</th>
          <th>Nilai Estimasi</th>
          <th>Status</th>
          <th>Catatan</th>
          <th>Sales / Aksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="padding:12px 20px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border-subtle);">
      Menampilkan <strong>${items.length}</strong> item
    </div>`;
  },

  // ================================================================
  //  FORM — ADD / EDIT
  // ================================================================
  openForm(id, month) {
    this._editingId    = id    || null;
    this._editingMonth = month || this._pipelineMonth;
    const item         = id ? DB.getPipelineById(id) : null;
    const title        = item ? 'Edit Pipeline Equipment' : 'Tambah Pipeline Equipment';

    // Ambil status/notes untuk bulan yang dipilih
    let prefillStatus = 'Perkenalan';
    let prefillNotes  = '';
    if (item) {
      const hist = this.getItemForMonth(item, this._editingMonth);
      prefillStatus = hist ? hist.status : (item.status || 'Perkenalan');
      prefillNotes  = hist ? (hist.notes || '') : (item.notes || '');
    }

    const statusOpts = this.STATUSES.map(s =>
      `<option value="${s}" ${s === prefillStatus ? 'selected' : ''}>${s}</option>`
    ).join('');

    const monthLabel = new Date(this._editingMonth + '-01')
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    App.openModal(title, `
      <div style="display:flex;flex-direction:column;gap:18px;">

        <!-- Month indicator -->
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:var(--radius-md);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span style="font-size:12px;color:var(--primary);font-weight:600;">
            Status & Catatan berlaku untuk bulan: <strong>${monthLabel}</strong>
          </span>
        </div>

        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Nama Dokter / Instansi</label>
            <input type="text" class="form-control" id="pf-doctor" placeholder="dr. Nama / Instansi RS"
              value="${item ? item.doctorName : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Nama Klinik / RS</label>
            <input type="text" class="form-control" id="pf-clinic" placeholder="Nama klinik atau RS"
              value="${item ? item.clinicName : ''}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nama Barang / Alkes</label>
          <input type="text" class="form-control" id="pf-item" placeholder="Nama produk / peralatan medis"
            value="${item ? item.itemName : ''}" />
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Nilai Estimasi (Rp)</label>
            <input type="text" class="form-control" id="pf-value"
              placeholder="Cth: 85.000.000"
              value="${item ? this.formatEstimasiRaw(item.estimatedValue) : ''}"
              oninput="Reports.onValueInput(this)" />
          </div>
          <div class="form-group">
            <label class="form-label">Status (${monthLabel})</label>
            <select class="form-control" id="pf-status">${statusOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Catatan (${monthLabel})</label>
          <textarea class="form-control" id="pf-notes" rows="3"
            placeholder="Catatan singkat tentang progress bulan ini..."
            style="resize:vertical;">${prefillNotes}</textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="App.closeModal()">Batal</button>
          <button class="btn btn-primary" onclick="Reports.saveForm()">
            ${item ? 'Simpan Perubahan' : 'Tambah Pipeline'}
          </button>
        </div>
      </div>
    `);
  },

  saveForm() {
    const doctorName = document.getElementById('pf-doctor').value.trim();
    const clinicName = document.getElementById('pf-clinic').value.trim();
    const itemName   = document.getElementById('pf-item').value.trim();
    const valueRaw   = document.getElementById('pf-value').value.replace(/\./g, '').replace(/\D/g, '');
    const status     = document.getElementById('pf-status').value;
    const notes      = document.getElementById('pf-notes').value.trim();
    const month      = this._editingMonth || this._pipelineMonth;

    if (!doctorName) { App.Toast.show('Masukkan nama dokter / instansi', 'warning'); return; }
    if (!itemName)   { App.Toast.show('Masukkan nama barang', 'warning'); return; }
    if (!valueRaw)   { App.Toast.show('Masukkan nilai estimasi', 'warning'); return; }

    const estimatedValue = parseInt(valueRaw, 10) || 0;
    const user = Auth.getCurrentUser();

    if (this._editingId) {
      // Update field global
      DB.updatePipeline(this._editingId, { doctorName, clinicName, itemName, estimatedValue });
      // Update statusHistory untuk bulan terpilih
      this.saveStatusForMonth(this._editingId, month, status, notes);
      App.Toast.show('Pipeline berhasil diperbarui', 'success');
    } else {
      // Tambah item baru dengan statusHistory untuk bulan terpilih
      const newId = DB.genId();
      DB.addPipeline({
        id: newId,
        doctorName, clinicName, itemName, estimatedValue,
        status, notes,
        salesId:   user.id,
        createdAt: DB.today(),
        statusHistory: [{ month, status, notes, updatedAt: DB.today() }],
      });
      App.Toast.show('Pipeline berhasil ditambahkan', 'success');
    }

    App.closeModal();
    this._editingId    = null;
    this._editingMonth = null;
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = this.renderPage();
  },

  confirmDelete(id) {
    const item = DB.getPipelineById(id);
    if (!item) return;
    if (!confirm(`Hapus "${item.itemName}" dari seluruh pipeline?`)) return;
    DB.deletePipeline(id);
    App.Toast.show('Item pipeline dihapus', 'success');
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = this.renderPage();
  },

  // ================================================================
  //  EVENT HANDLERS
  // ================================================================

  /** Inline status change dari dropdown di tabel */
  onStatusChange(itemId, month, newStatus) {
    this.saveStatusForMonth(itemId, month, newStatus, undefined);
    App.Toast.show(`Status diubah ke "${newStatus}" untuk bulan ini`, 'success');
    // Refresh tabel agar filter status ter-update
    this.refreshTable();
  },

  onFilterMonth(value) {
    if (!value) return;
    this._pipelineMonth = value;
    this.refreshTable(true); // true = re-render full pipeline tab
  },

  switchTab(tab) {
    this._activeTab = tab;
    const tabContent = document.getElementById('reports-tab-content');
    if (tabContent) {
      tabContent.innerHTML = tab === 'pipeline' ? this.renderPipelineTab() : this.renderOverviewTab();
    }
    document.querySelectorAll('.reports-tab').forEach(el => {
      el.classList.toggle('active', el.textContent.trim().toLowerCase().includes(tab === 'pipeline' ? 'pipeline' : 'overview'));
    });
  },

  onSearch(value) {
    this._searchQuery = value;
    this.refreshTable();
  },

  onFilterStatus(value) {
    this._filterStatus = value;
    this.refreshTable();
  },

  refreshTable(fullTab = false) {
    if (fullTab) {
      const tabContent = document.getElementById('reports-tab-content');
      if (tabContent) tabContent.innerHTML = this.renderPipelineTab();
    } else {
      const wrapper = document.getElementById('pipeline-table-wrapper');
      if (wrapper) wrapper.innerHTML = this.renderPipelineTable();
    }
  },

  // ================================================================
  //  VALUE FORMATTING
  // ================================================================
  formatEstimasi(num) {
    if (!num && num !== 0) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  },

  formatEstimasiRaw(num) {
    if (!num) return '';
    return Number(num).toLocaleString('id-ID');
  },

  onValueInput(el) {
    if (!el) return;
    const digits = el.value.replace(/\D/g, '');
    el.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  },
};

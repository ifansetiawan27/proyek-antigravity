/* ============================================================
   LEADERBOARD MODULE
   ============================================================ */

const Leaderboard = {
  renderPage() {
    const board = DB.getLeaderboard();
    const currentUser = Auth.getCurrentUser();

    // Stats
    const totalSalesAll = board.reduce((s, u) => s + u.total, 0);
    const top = board[0];
    const achievers = board.filter(u => u.target > 0 && u.total >= u.target).length;

    return `
    <div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1>🏆 Leaderboard Sales</h1>
          <p>Peringkat kinerja tim sales berdasarkan total penjualan</p>
        </div>
        <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);padding:8px 14px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);">
          Update real-time setiap transaksi masuk
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-grid" style="margin-bottom:28px;">
        <div class="stat-card primary">
          <div class="stat-icon primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-value" style="font-size:18px;">${DB.formatRupiah(totalSalesAll)}</div>
          <div class="stat-label">Total Omset Tim</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="stat-value" style="font-size:14px;">${top ? top.name : '–'}</div>
          <div class="stat-label">Top Performer 🥇</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="stat-value">${achievers}</div>
          <div class="stat-label">Capai Target 🎯</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-value">${board.length}</div>
          <div class="stat-label">Total Sales</div>
        </div>
      </div>

      <!-- Top 3 Podium -->
      ${board.length >= 3 ? this.renderPodium(board) : ''}

      <!-- Full Leaderboard -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Semua Peringkat</div>
            <div class="card-subtitle">Total dari seluruh transaksi yang tercatat</div>
          </div>
        </div>
        <div class="leaderboard-list">
          ${board.map((s, i) => this.renderLeaderboardItem(s, i + 1, currentUser)).join('')}
        </div>
      </div>
    </div>`;
  },

  renderPodium(board) {
    const [first, second, third] = board;
    const podiumCard = (user, rank, height, color) => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="font-size:28px;">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</div>
        <div style="width:56px;height:56px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;box-shadow:0 4px 16px ${color}66;">
          ${DB.initials(user.name)}
        </div>
        <div style="font-size:13px;font-weight:700;text-align:center;">${user.name.split(' ')[0]}</div>
        <div style="font-size:12px;color:var(--primary-light);font-weight:600;">${DB.formatRupiah(user.total)}</div>
        <div style="background:${color}22;border:1px solid ${color}44;border-radius:var(--radius-md);padding:${height}px 20px 0;width:100%;margin-top:4px;"></div>
      </div>`;

    return `
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.05));">
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;padding:16px 0 0;">
        ${podiumCard(second, 2, 20, '#94a3b8')}
        ${podiumCard(first, 1, 50, '#f59e0b')}
        ${podiumCard(third, 3, 8, '#cd7f32')}
      </div>
    </div>`;
  },

  renderLeaderboardItem(user, rank, currentUser) {
    const isMe = currentUser && user.id === currentUser.id;
    const pct = user.target > 0 ? Math.min((user.total / user.target) * 100, 100) : 0;
    const achieved = user.target > 0 && user.total >= user.target;
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const badge = achieved ? '🎯' : medals[rank] || '';

    const rankColor = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text-muted)';
    const progressColor = achieved ? 'success' : pct > 70 ? '' : 'warning';

    return `
    <div class="leaderboard-item rank-${rank} ${isMe ? 'border-primary' : ''}" style="${isMe ? 'border-color:var(--primary);box-shadow:0 0 0 1px var(--primary);' : ''}">
      ${badge ? `<div class="lb-badge">${badge}</div>` : ''}
      <div class="lb-rank" style="color:${rankColor};">${rank}</div>
      <div class="lb-avatar" style="${rank===1?'background:linear-gradient(135deg,#f59e0b,#d97706);':rank===2?'background:linear-gradient(135deg,#94a3b8,#64748b);':rank===3?'background:linear-gradient(135deg,#cd7f32,#a05c20);':''}">${DB.initials(user.name)}</div>
      <div class="lb-info">
        <div class="lb-name">${user.name} ${isMe ? '<span class="badge badge-primary" style="font-size:10px;">Saya</span>' : ''}</div>
        <div class="lb-meta">${user.area} • ${user.txCount} transaksi</div>
      </div>
      <div class="lb-progress">
        <div class="progress-wrap">
          <div class="progress-label" style="font-size:11px;">
            <span style="color:var(--text-muted);">Target ${DB.formatRupiah(user.target)}</span>
            <span style="color:${achieved?'var(--success)':pct>70?'var(--warning)':'var(--text-muted)'};">${user.target > 0 ? pct.toFixed(1) + '%' : 'No Target'}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${progressColor}" style="width:${pct}%;"></div>
          </div>
        </div>
      </div>
      <div class="lb-sales">
        <div class="lb-sales-val">${DB.formatRupiah(user.total)}</div>
        <div class="lb-sales-label">Total Penjualan</div>
      </div>
    </div>`;
  },
};

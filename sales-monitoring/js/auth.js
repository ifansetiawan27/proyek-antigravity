/* ============================================================
   AUTH — Login, Session, Role Guard
   ============================================================ */

const Auth = {
  SESSION_KEY: 'sm_session',

  async login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error');

    if (!username || !password) {
      errEl.classList.remove('hidden');
      errEl.lastChild.textContent = ' Mohon isi username dan password';
      return;
    }

    let user = DB.getUserByUsername(username);
    if (!user && DB.remoteClient) {
      user = await DB.fetchUserByUsername(username);
      if (user) {
        // Verify password before caching; strip it from the cached record
        if (user.password !== password) {
          errEl.classList.remove('hidden');
          errEl.lastChild.textContent = ' Username atau password salah';
          return;
        }
        const { password: _pw, ...safeUser } = user;
        const users = DB.getUsers();
        users.push(safeUser);
        DB.set(DB.KEYS.users, users);
        user = safeUser;
      }
    }

    if (!user || user.password !== password) {
      errEl.classList.remove('hidden');
      errEl.lastChild.textContent = ' Username atau password salah';
      // Shake animation
      const card = document.querySelector('.login-card');
      card.style.animation = 'none';
      setTimeout(() => {
        card.style.animation = 'shake 0.4s ease';
      }, 10);
      return;
    }

    errEl.classList.add('hidden');
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ id: user.id, role: user.role }));
    this.onLoginSuccess(user);
  },

  fillDemo(username, password) {
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    App.Toast.show('Anda telah keluar dari sistem', 'info');
  },

  getSession() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)); }
    catch { return null; }
  },

  getCurrentUser() {
    const s = this.getSession();
    if (!s) return null;
    return DB.getUserById(s.id);
  },

  isManager() {
    const s = this.getSession();
    return s && s.role === 'manager';
  },

  onLoginSuccess(user) {
    // Show app
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Update topbar user info
    const initials = DB.initials(user.name);
    const roleLabel = user.role === 'manager' ? 'Sales Manager' : 'Sales Representative';
    const el = (id) => document.getElementById(id);
    if (el('topbar-avatar-initials')) el('topbar-avatar-initials').textContent = initials;
    if (el('topbar-avatar')) el('topbar-avatar').textContent = initials;
    if (el('topbar-user-name')) el('topbar-user-name').textContent = user.name;
    if (el('topbar-user-email')) el('topbar-user-email').textContent = '@' + (user.username || user.name.toLowerCase().replace(/\s/g,''));
    // Legacy sidebar elements (safe fallbacks)
    if (el('sidebar-name')) el('sidebar-name').textContent = user.name;
    if (el('sidebar-role')) el('sidebar-role').textContent = roleLabel;
    if (el('sidebar-avatar')) el('sidebar-avatar').textContent = initials;

    // Show manager items if role = manager
    document.querySelectorAll('.manager-only').forEach(el => {
      user.role === 'manager' ? el.classList.remove('hidden') : el.classList.add('hidden');
    });

    App.navigate('dashboard');
    App.Toast.show(`Selamat datang, ${user.name}! 👋`, 'success');
  },

  checkSession() {
    const s = this.getSession();
    if (s) {
      const user = DB.getUserById(s.id);
      if (user) { this.onLoginSuccess(user); return true; }
    }
    return false;
  }
};

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-10px)}
  40%{transform:translateX(10px)}
  60%{transform:translateX(-6px)}
  80%{transform:translateX(6px)}
}`;
document.head.appendChild(shakeStyle);

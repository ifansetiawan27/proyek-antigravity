/* ============================================================
   AUTH — Login, Session, Role Guard
   ============================================================ */

const Auth = {
  SESSION_KEY: 'sm_session',

  async login() {
    const rawInput = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl    = document.getElementById('login-error');

    const showLoginErr = () => {
      errEl.classList.remove('hidden');
      errEl.lastChild.textContent = ' Username atau password salah';
      this._shakeCard();
    };

    if (!rawInput || !password) {
      errEl.classList.remove('hidden');
      errEl.lastChild.textContent = ' Mohon isi username dan password';
      return;
    }

    // Dukung input email (ifan@sales.com) atau username (ifan)
    const username = rawInput.includes('@') ? rawInput.split('@')[0] : rawInput;

    // Retry Supabase init jika belum terhubung
    if (!DB.remoteClient) DB.initRemote();

    const btn = document.getElementById('login-btn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:middle"></span>Memeriksa...`;
    }

    try {
      let user = null;

      // ── Langkah 1: Cari di localStorage (bisa ada dari fetchRemoteData) ──
      const cached = DB.getUserByUsername(username);
      if (cached) {
        // User ditemukan di cache — verifikasi password
        if (cached.password && cached.password === password) {
          user = cached;
        } else if (cached.password && cached.password !== password) {
          // Password di cache ada tapi salah → tidak perlu ke Supabase
          return showLoginErr();
        }
        // Jika cached.password tidak ada, lanjut ke Supabase (mungkin cached tanpa password)
      }

      // ── Langkah 2: Ambil langsung dari Supabase jika belum dapat user ──
      if (!user && DB.remoteClient) {
        const remote = await DB.fetchUserByUsername(username);
        if (!remote) return showLoginErr();               // username tidak ada
        if (remote.password !== password) return showLoginErr(); // password salah

        // Simpan ke localStorage WITH password agar login berikutnya pakai cache
        const list = DB.getUsers();
        const idx  = list.findIndex(u => u.username === remote.username);
        if (idx !== -1) list[idx] = remote; else list.push(remote);
        DB.set(DB.KEYS.users, list);
        user = remote;
      }

      // ── Langkah 3: Gagal total ──
      if (!user) return showLoginErr();

      // ── Sukses ──
      errEl.classList.add('hidden');
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ id: user.id, role: user.role }));
      this.onLoginSuccess(user);

    } catch (e) {
      console.error('Login error:', e);
      showLoginErr();
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
    }
  },

  _shakeCard() {
    const card = document.querySelector('.login-card');
    if (!card) return;
    card.style.animation = 'none';
    setTimeout(() => { card.style.animation = 'shake 0.4s ease'; }, 10);
  },

  fillDemo(username, password) {
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
  },

  // ---- Toggle Login ↔ Signup ----
  toggleForm(mode) {
    const loginForm     = document.getElementById('login-form');
    const signupWrapper = document.getElementById('signup-wrapper');
    const linkToSignup  = document.getElementById('link-to-signup');
    const linkToLogin   = document.getElementById('link-to-login');
    const titleEl       = document.querySelector('.login-title');
    const subtitleEl    = document.querySelector('.login-subtitle');

    // Reset error & success di kedua form
    ['login-error', 'signup-error'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const successEl = document.getElementById('signup-success');
    if (successEl) successEl.style.display = 'none';

    if (mode === 'signup') {
      loginForm.classList.add('hidden');
      signupWrapper.classList.remove('hidden');
      linkToSignup.classList.add('hidden');
      linkToLogin.classList.remove('hidden');
      if (titleEl)    titleEl.textContent    = 'Buat Akun Baru';
      if (subtitleEl) subtitleEl.textContent = 'Daftarkan akun @sales.com Anda';
    } else {
      loginForm.classList.remove('hidden');
      signupWrapper.classList.add('hidden');
      linkToSignup.classList.remove('hidden');
      linkToLogin.classList.add('hidden');
      if (titleEl)    titleEl.textContent    = 'Selamat Datang Kembali';
      if (subtitleEl) subtitleEl.textContent = 'Masuk ke akun Anda untuk melanjutkan';
    }
  },

  // ---- Signup ----
  async signup() {
    const name            = document.getElementById('signup-name').value.trim();
    const email           = document.getElementById('signup-email').value.trim().toLowerCase();
    const password        = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const errEl           = document.getElementById('signup-error');
    const successEl       = document.getElementById('signup-success');
    const btn             = document.getElementById('signup-btn');

    const showErr = (msg) => {
      errEl.classList.remove('hidden');
      errEl.lastChild.textContent = ' ' + msg;
    };

    errEl.classList.add('hidden');
    if (successEl) successEl.style.display = 'none';

    // Validasi
    if (!name)                          return showErr('Mohon isi nama lengkap');
    if (!email)                         return showErr('Mohon isi email');
    if (!email.endsWith('@sales.com'))  return showErr('Email harus menggunakan domain @sales.com');
    if (!password)                      return showErr('Mohon isi password');
    if (password.length < 6)           return showErr('Password minimal 6 karakter');
    if (password !== confirmPassword)  return showErr('Konfirmasi password tidak cocok');

    // Coba init ulang jika remoteClient belum ada
    if (!DB.remoteClient) DB.initRemote();
    if (!DB.remoteClient) {
      const sdkOk = typeof supabase !== 'undefined';
      const cfgOk = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUPABASE_URL;
      if (!sdkOk) return showErr('Supabase SDK gagal dimuat. Cek koneksi internet lalu refresh halaman.');
      if (!cfgOk) return showErr('File config.js tidak ditemukan. Pastikan aplikasi dijalankan via server (bukan file://).');
      return showErr('Gagal terhubung ke Supabase. Periksa SUPABASE_URL dan SUPABASE_KEY di config.js');
    }

    // Username = prefix email (misal: ifan dari ifan@sales.com)
    const username = email.split('@')[0];

    // Cek username sudah ada di local cache
    if (DB.getUserByUsername(username)) {
      return showErr(`Username "${username}" sudah digunakan. Gunakan email lain.`);
    }

    // Loading state
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:middle"></span>Mendaftar...`;

    try {
      // 1. Daftar ke Supabase Authentication (tampil di Auth > Users di dashboard)
      const { data: authData, error: authError } = await DB.remoteClient.auth.signUp({
        email,
        password,
        options: {
          data: { name, username, role: 'sales' }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Email ini sudah terdaftar. Gunakan email lain atau langsung login.');
        }
        throw authError;
      }

      // 2. Insert ke tabel public.users (sistem login aplikasi)
      const newUser = {
        id:       DB.genId(),
        name,
        username,
        password, // plain text — konsisten dengan sistem existing
        role:     'sales',
        area:     '',
        target:   0,
        avatar:   DB.initials(name),
      };

      const { error: insertError } = await DB.remoteClient
        .from('users')
        .insert(newUser);

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`Username "${username}" sudah digunakan. Gunakan email lain.`);
        }
        throw insertError;
      }

      // 3. Cache ke localStorage agar bisa langsung login
      const users = DB.getUsers();
      users.push(newUser);
      DB.set(DB.KEYS.users, users);

      // 4. Tampilkan hasil
      const needsConfirmation = authData.user && !authData.session;
      if (needsConfirmation) {
        // Supabase minta konfirmasi email — tampilkan pesan
        if (successEl) {
          successEl.style.display = 'flex';
          successEl.lastChild.textContent = ` Akun berhasil dibuat! Cek email ${email} untuk konfirmasi, lalu login dengan username: ${username}`;
        }
        App.Toast.show(`Akun ${name} dibuat! Cek email untuk konfirmasi.`, 'success');
      } else {
        // Langsung bisa login — arahkan ke form login
        App.Toast.show(`Akun ${name} berhasil dibuat! Silakan login.`, 'success');
        this.toggleForm('login');
        document.getElementById('login-username').value = username;
        document.getElementById('login-username').focus();
      }

    } catch (e) {
      showErr(e.message || 'Gagal membuat akun. Coba lagi.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
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

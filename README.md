# SalesMonitor — Sales Intelligence Platform

Platform internal untuk monitoring kinerja tim sales, pencatatan transaksi, loyalty program dokter, dan analitik produk terlaris.

---

## Fitur Utama

| Halaman | Deskripsi |
|---|---|
| **Dashboard** | Ringkasan kinerja personal (sales) atau seluruh tim (manager) |
| **Appsheet v.7** | Penggabungan & manajemen stok gudang dari KBT, SBI, KDS |
| **Transaksi** | Input, edit, hapus transaksi penjualan per dokter |
| **Loyalty Program** | Sistem stamp dokter — setiap Rp 2.5jt = 1 stamp, 4 stamp = reward |
| **20 Best Products** | Analitik produk terlaris berdasarkan revenue & kuantitas |
| **Leaderboard** | Peringkat kinerja tim sales |
| **Reports** | Laporan & export Excel |
| **Panel Manager** | Kelola target sales, kelola anggota tim (khusus manager) |

---

## Tech Stack

- **Frontend** — Pure HTML5, CSS3, Vanilla JavaScript (SPA tanpa framework)
- **Database** — [Supabase](https://supabase.com) (PostgreSQL)
- **Storage lokal** — `localStorage` sebagai cache offline
- **Library** — Supabase JS v2, SheetJS (export Excel)
- **Hosting** — Static file (Vercel / Netlify / GitHub Pages)

---

## Struktur Folder

```
proyek-antigravity/
├── sales-monitoring/
│   ├── index.html              # Entry point aplikasi
│   ├── setup-db.html           # Halaman setup tabel Supabase (sekali pakai)
│   ├── setup-database.sql      # SQL DDL + data users untuk Supabase
│   ├── .env                    # Referensi dokumentasi (tidak dibaca browser)
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── config.js           # ⚠️ TIDAK di-commit — berisi API key Supabase
│       ├── config.example.js   # Template config.js untuk tim
│       ├── data.js             # Data layer: localStorage CRUD + Supabase sync
│       ├── auth.js             # Login, session, role guard
│       ├── app.js              # SPA router, navigation, dashboard
│       ├── transactions.js     # Modul transaksi
│       ├── loyalty.js          # Modul loyalty program dokter
│       ├── products.js         # Modul 20 best products
│       ├── leaderboard.js      # Modul leaderboard
│       ├── reports.js          # Modul laporan & export
│       └── manager.js          # Panel manager
├── .gitignore
└── README.md
```

---

## Setup & Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/ifansetiawan27/proyek-antigravity.git
cd proyek-antigravity
```

### 2. Buat file `config.js`

```bash
cp sales-monitoring/js/config.example.js sales-monitoring/js/config.js
```

Isi `config.js` dengan kredensial Supabase Anda:

```js
const APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_KEY: 'YOUR_SUPABASE_ANON_KEY',
};
```

> Dapatkan URL & Key dari: **Supabase Dashboard → Project Settings → API**

### 3. Setup Database Supabase

- Buka **Supabase Dashboard → SQL Editor**
- Copy isi file `sales-monitoring/setup-database.sql`
- Paste → klik **Run**

Atau gunakan halaman setup otomatis:

```
sales-monitoring/setup-db.html
```

### 4. Jalankan Aplikasi

Buka `sales-monitoring/index.html` via local server (VS Code Live Server, dll).

> **Jangan** buka langsung sebagai `file://` — gunakan local server agar `config.js` bisa dimuat.

---

## Akun Default

| Username | Password | Role |
|---|---|---|
| `manager1` | `manager123` | Manager |
| `ifan` | `sales123` | Sales |
| `cici` | `sales123` | Sales |
| `iqbal` | `sales123` | Sales |
| `pirman` | `sales123` | Sales |
| `nita` | `sales123` | Sales |
| `Try` | `sales123` | Sales |
| `Agus` | `sales123` | Sales |

---

## Alur Data

```
Browser
  │
  ├─► localStorage (cache lokal, offline-first)
  │
  └─► Supabase PostgreSQL (cloud, real-time sync)
        ├── users
        ├── doctors
        ├── products
        ├── transactions
        ├── pipeline
        └── stock
```

Setiap operasi (tambah/edit/hapus) langsung disinkronkan ke Supabase secara otomatis. Saat pertama load, data diambil dari Supabase dan di-cache ke localStorage.

---

## Import Stok dari Excel

Halaman **Appsheet v.7** mendukung import file Excel dari 3 sumber:

| Sumber | Format |
|---|---|
| **KBT** | Nama Gudang, Kode Barang, Nama Barang, Kuantitas, Hrg Jual, Diskon, Kategori |
| **SBI** | Kode Barang, Nama Barang, Kuantitas, Diskon, Hrg Jual, Satuan, Nama Gudang |
| **KDS** | Nama Gudang, Kode Barang, Nama Barang, Kuantitas, Pemasok, Hrg Jual, Diskon |

Data dari ketiga sumber digabung otomatis berdasarkan **Kode Barang + Nama Gudang**.

---

## Deployment

Aplikasi ini adalah **pure static HTML** — deploy ke mana saja tanpa build step:

**Vercel / Netlify:**
```
Root directory : sales-monitoring/
```

**GitHub Pages:**
```
Settings → Pages → Source: main branch → /sales-monitoring folder
```

> Pastikan `js/config.js` **tidak** ikut ter-push ke repository (sudah ada di `.gitignore`).
> Set environment variable / config di server hosting atau gunakan file config terpisah.

---

## Catatan Keamanan

- `js/config.js` berisi `anon key` Supabase — aman di-expose di frontend karena Row Level Security dapat diaktifkan
- Password user disimpan sebagai plain text di database — untuk produksi, implementasikan hashing (bcrypt)
- File `config.js` sudah ditambahkan ke `.gitignore` dan tidak ikut ter-commit

---

## Lisensi

Internal use only — PT Antigravity

# PRD — Sistem Presensi Online Ribathul Quran

## 1. Ringkasan Produk

Aplikasi web presensi santri untuk Pondok Pesantren Ribathul Quran. Diakses via browser/PWA oleh dua jenis pengguna: **Ustaz** (input presensi) dan **Admin** (kelola seluruh data). Backend sepenuhnya berbasis Google Apps Script + Google Spreadsheet, tanpa server sendiri.

---

## 2. Tujuan & Konteks

- Menggantikan pencatatan presensi manual (kertas/buku) dengan sistem digital yang bisa diakses dari HP.
- Data tersimpan di Google Spreadsheet sehingga mudah diakses dan tidak butuh hosting berbayar.
- Bisa diinstall sebagai PWA agar ustaz bisa menggunakannya seperti aplikasi native di HP.

---

## 3. Pengguna & Role

| Role | Akses | Batasan |
|---|---|---|
| **Admin** | Dashboard, Rekap, Santri, Libur, Kelas, Users | Tidak bisa buka halaman Presensi |
| **Ustaz** | Dashboard, Presensi | Hanya bisa lihat dan input kelas miliknya sendiri |

- Setiap akun Ustaz terikat ke satu kelas (`kelas` field di tabel Users).
- Admin tidak terikat kelas — bisa lihat semua data.
- Tidak ada fitur self-register. Admin yang membuat akun Ustaz baru.

---

## 4. Arsitektur Sistem

### 4.1 Frontend
- Pure static HTML/CSS/JS — tidak ada build step, tidak ada bundler, tidak ada package manager.
- Setiap halaman adalah file `.html` terpisah.
- Shared scripts dimuat dengan urutan wajib: `config.js` → `api.js` → `auth.js` → `utils.js` → JS halaman.
- Urutan ini kritis: `api.js` butuh `CONFIG`, `auth.js` butuh `API`, `utils.js` butuh `CONFIG`.

### 4.2 Backend
- Google Apps Script (GAS) di-deploy sebagai **Web App**.
  - Execute as: **Me**
  - Who has access: **Anyone**
- Seluruh data disimpan di satu Google Spreadsheet dengan sheet-sheet berikut:

| Sheet | Kolom | Keterangan |
|---|---|---|
| `Users` | Username, Password, Role, Kelas | Akun login |
| `Santri` | Nama, Kelas | Data santri |
| `Presensi` | Tanggal, Sesi, Nama, Kelas, Status, WaktuInput | Rekaman presensi |
| `Libur` | Tanggal, Sesi, Keterangan | Libur khusus |
| `Kelas` | Nama Kelas | Daftar kelas aktif |

- URL GAS deployment disimpan di `js/config.js` sebagai `CONFIG.API_URL`.

### 4.3 Komunikasi API
- **GET**: `fetch(CONFIG.API_URL + "?action=...&param=...")`
- **POST**: `fetch(CONFIG.API_URL, { method: 'POST', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify({action, ...params}), redirect: 'follow' })`
  - `Content-Type: text/plain` adalah **keharusan** — GAS tidak menerima `application/json` via CORS.
  - `redirect: 'follow'` adalah **keharusan** — GAS mengembalikan redirect 302 saat POST berhasil.
- Semua respons API: `{ success: boolean, data?: any[], message?: string }`

### 4.4 Autentikasi
- Login via POST ke GAS — username + password dicocokkan dengan sheet `Users`.
- Setelah berhasil, GAS mengembalikan `{ success: true, user: { username, role, kelas } }`.
- Sesi disimpan di `sessionStorage` dengan dua key:
  - `loggedIn` → string `"true"`
  - `user` → JSON string `{ username, role, kelas }`
- Setiap halaman protected memanggil `Auth.requireLogin()` sebagai baris pertama `DOMContentLoaded`.
- Logout: hapus `sessionStorage`, redirect ke `index.html`.

---

## 5. Halaman & Fitur

### 5.1 `index.html` — Login
- Form: username (text) + password (password).
- Jika sudah login (sessionStorage ada), langsung redirect ke `dashboard.html`.
- Setelah login berhasil → `Auth.setLoggedIn(user)` → redirect ke `dashboard.html`.
- Tidak memuat `utils.js` (tidak butuh sidebar/utils).
- Hanya halaman ini yang menggunakan `<script>` inline untuk logika login.

### 5.2 `dashboard.html` — Dashboard (Semua Role)
- Tampilkan tanggal hari ini (format panjang bahasa Indonesia).
- **Kartu Statistik Hari Ini**:
  - Ambil data presensi hari ini via `API.getPresensiByDate(today)`.
  - Tampilkan 4 angka: Hadir, Izin, Sakit, Alfa.
  - Filter tab: Semua | Pagi | Malam (frontend filter, bukan API call ulang).
  - Grafik donat (Chart.js) — proporsi 4 status.
  - Untuk Admin: tambahkan grafik bar perbandingan kehadiran antar kelas (Hadir+Izin+Sakit / Total per kelas, dalam %).
  - Untuk Ustaz: data di-filter frontend hanya untuk `kelas` miliknya.
- **Kartu Grafik 3 Hari Terakhir**:
  - Ambil data 3 hari secara paralel (`Promise.all`).
  - Grafik bar % kehadiran per hari (Hadir+Izin+Sakit / Total).
  - Klik bar → modal popup daftar santri yang Alfa hari itu, dikelompokkan per sesi Pagi / Malam.
- Library: Chart.js dari CDN `https://cdn.jsdelivr.net/npm/chart.js`.

### 5.3 `presensi.html` — Input Presensi (Ustaz Only)
- Redirect Admin ke `dashboard.html` jika mencoba buka halaman ini.
- **Filter**: Tanggal (date input, default hari ini) + Sesi (Pagi/Malam tabs) + Kelas tabs.
  - Untuk Ustaz: tab kelas hanya menampilkan kelas miliknya, tidak bisa pindah kelas lain.
- **Cek Libur**: sebelum load santri, panggil `API.checkLibur(tanggal, sesi)`. Jika libur → tampilkan banner kuning berisi keterangan libur, jangan tampilkan daftar santri.
- **Daftar Santri**: ambil `API.getSantri(kelas)` dan `API.getPresensi(tanggal, sesi, kelas)` secara paralel.
  - Tiap santri: nama + label kelas + select status (Hadir/Izin/Sakit/Alfa).
  - Jika presensi sudah pernah disimpan, status existing ditampilkan sebagai default.
  - Warna select berubah sesuai status yang dipilih.
- **Simpan**: kirim seluruh list via `API.savePresensi(tanggal, sesi, presensiArray)`.
  - Backend akan hapus dulu semua baris presensi untuk tanggal+sesi+kelas yang sama, lalu insert ulang — perilaku "overwrite", bukan append.
- **Race condition guard**: variabel `loadRequestId` diincrement setiap kali ada trigger load. Setiap `await` di dalam `loadSantri()` mengecek `thisRequestId !== loadRequestId` — jika basi, fungsi langsung return.

### 5.4 `santri.html` — Kelola Data Santri (Admin Only)
- Tampilkan daftar santri, difilter per kelas via tab (Semua | A | B | C | D — dinamis dari `CONFIG.KELAS`).
- **Tambah**: modal form → Nama + Kelas → `API.addSantri(nama, kelas)`. Backend tolak duplikat nama+kelas.
- **Edit**: modal form pre-filled → `API.editSantri(namaLama, kelasLama, namaBaru, kelasBaru)`. Backend juga update nama/kelas di sheet Presensi.
- **Hapus**: modal konfirmasi → `API.deleteSantri(nama, kelas)`.
- Daftar diurutkan: kelas alphabetical, lalu nama alphabetical.

### 5.5 `rekap.html` — Rekap Kehadiran (Admin Only)
- Filter: Tanggal Mulai + Tanggal Akhir (default: awal bulan s/d hari ini) + Filter Kelas tabs + Filter Nama (text search).
- Tampilkan tabel: Nama | Kelas | Total Sesi | Hadir | Izin | Sakit | Alfa | Total Hadir | %.
- **Formula Persentase (Frontend)**:
  - `totalHadir = Hadir + Izin + Sakit` (Izin dan Sakit dihitung "hadir" untuk persentase)
  - `persentase = totalHadir / totalSesi * 100`
  - Berbeda dengan backend yang menghitung `Hadir / total`. Frontend yang dipakai untuk tampilan.
- Warna persentase: hijau >= 80%, kuning >= 60%, merah < 60%.
- **Export Excel**: via SheetJS (`xlsx@0.18.5`).
  - Jika filter "Semua kelas": satu file, sheet terpisah per kelas (A, B, C, D), plus sheet "Lainnya" untuk kelas di luar CONFIG.
  - Jika filter satu kelas: satu sheet saja.
  - Nama file: `Rekap_Presensi_YYYYMMDD_ke_YYYYMMDD.xlsx`.
- Library: SheetJS dari CDN `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`.

### 5.6 `libur.html` — Kelola Hari Libur (Admin Only)
- **Libur otomatis hardcoded** (tidak perlu diinput, backend handle di `handleCheckLibur`):
  - Setiap Kamis Malam → libur mingguan.
  - Setiap Jumat Pagi → libur mingguan.
  - Ditampilkan sebagai kartu info statis di halaman ini agar admin tahu.
- **Libur khusus**: admin bisa tambah tanggal libur spesifik.
  - Field: Tanggal + Sesi (Pagi | Malam | **Semua**) + Keterangan.
  - Backend: jika `Sesi === "Semua"`, berarti libur berlaku untuk Pagi dan Malam.
- Hapus libur: tombol hapus per item → konfirmasi → `API.deleteLibur(tanggal, sesi)`.
- Daftar libur diurutkan: tanggal terbaru di atas.

### 5.7 `kelas.html` — Kelola Kelas (Admin Only)
- Tampilkan daftar kelas dari `API.getKelas()`.
- Setelah data kelas di-fetch, `CONFIG.KELAS` dioverwrite: `CONFIG.KELAS = data`. Ini hanya berlaku di tab kelas.html saja, halaman lain tetap pakai array statis dari `config.js`.
- **Tambah**: form inline → nama kelas → `API.addKelas(namaKelas)`. Backend tolak duplikat.
- **Hapus**: modal konfirmasi → `API.deleteKelas(namaKelas)`. Backend tolak hapus jika masih ada santri di kelas tersebut.

### 5.8 `users.html` — Kelola Akun (Admin Only)
- Tampilkan daftar semua user: username + role badge + kelas (untuk Ustaz).
- **Tambah**: modal → Username + Password + Role (admin/ustaz) + Kelas (muncul hanya jika role = ustaz).
  - Password field `type="text"` (plaintext — disengaja untuk kemudahan pesantren).
  - `API.addUser(username, password, role, kelas)`. Backend tolak username duplikat.
- **Edit**: modal pre-filled → password boleh dikosongkan (tidak wajib ganti). `API.editUser(oldUsername, username, password, role, kelas)`.
  - Jika role diubah jadi admin, kelas dikosongkan.
- **Hapus**: tombol hapus **tidak muncul** untuk akun yang sedang login (self-deletion guard). `API.deleteUser(username)`.

---

## 6. Komponen Bersama

### 6.1 Sidebar Navigasi
Semua halaman (kecuali `index.html`) punya sidebar dengan 7 link:
1. Beranda (`dashboard.html`)
2. Presensi (`presensi.html`) — disembunyikan untuk Admin
3. Santri (`santri.html`) — disembunyikan untuk Ustaz
4. Rekap (`rekap.html`) — disembunyikan untuk Ustaz
5. Hari Libur (`libur.html`) — disembunyikan untuk Ustaz
6. Kelola Kelas (`kelas.html`) — disembunyikan untuk Ustaz
7. Kelola Akun (`users.html`) — disembunyikan untuk Ustaz

Sidebar: slide-in dari kiri di mobile (hamburger button), selalu tampil di desktop (>=992px). Dikontrol oleh `initSidebar()` di `utils.js` yang dipanggil otomatis via `DOMContentLoaded`.

Tombol `.btn-back` di halaman non-dashboard disembunyikan untuk Admin (Admin tidak perlu "kembali" karena navigasi via sidebar).

### 6.2 Toast Notification
`showToast(message, type)` — type: `success` | `error` | `warning` | `info`. Auto-hilang setelah 3 detik. Butuh elemen `<div id="toastContainer">` di setiap halaman.

### 6.3 Shared Utilities (`utils.js`)

| Fungsi | Kegunaan |
|---|---|
| `escapeHtml(str)` | Sanitasi untuk innerHTML |
| `formatDate(dateObj)` | Date -> YYYY-MM-DD (untuk API) |
| `formatDisplayDate(str, opts)` | YYYY-MM-DD -> format Indonesia (untuk tampilan) |
| `showToast(message, type)` | Notifikasi toast |
| `safeArray(result)` | Ekstrak `.data` dari API result, fallback `[]` |
| `initSidebar()` | Wire hamburger/overlay/close sidebar |
| `renderKelasTabs(id, includeSemua, cb)` | Render tab filter kelas dinamis dari CONFIG.KELAS |
| `renderKelasOptions(selectId)` | Render <option> kelas dinamis dari CONFIG.KELAS |

### 6.4 Show/Hide Convention
Gunakan class `.hidden { display: none !important; }` — semua JS menggunakan `classList.add/remove('hidden')`. Jangan gunakan `style.display` langsung.

---

## 7. Konfigurasi Global (`config.js`)

```javascript
const CONFIG = {
  API_URL: '<URL GAS deployment>',
  APP_NAME: 'Presensi Ribathul Quran',
  KELAS: ['A', 'B', 'C', 'D'],    // dapat dioverwrite di kelas.js
  SESI: ['Pagi', 'Malam'],
  STATUS: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
  VERSION: '1.0.0'
};
```

Catatan: `CONFIG.KELAS` adalah array yang **dioverwrite di runtime** oleh `kelas.js` setelah fetch dari API. Halaman lain memakai nilai statis.

---

## 8. PWA

- `manifest.json`: name, short_name, start_url (`index.html`), display (`standalone`), theme `#1B5E20`, icon dari logo pesantren.
- `sw.js`: Service Worker dengan strategi Cache First.
  - **Di-cache**: semua HTML, CSS, JS (kecuali `kelas.html`, `users.html`, `js/kelas.js`, `js/users.js`), logo, Chart.js CDN, SheetJS CDN.
  - **Tidak di-cache**: request ke `script.google.com` (data API).
  - Offline fallback: jika HTML page tidak ditemukan, serve `index.html`.
- Registrasi SW: di `auth.js` DOMContentLoaded, pada event `window load`.

---

## 9. Desain & UI

### 9.1 CSS Architecture
- File tunggal `css/style.css`, mobile-first, pure CSS.
- CSS Variables di `:root` untuk tema — ubah `--primary` dan var terkait untuk ganti tema. Warna utama: hijau pesantren `#1B5E20`.
- Desktop breakpoint: `992px` — sidebar jadi static, layout berubah 2-kolom, `.btn-back` disembunyikan via CSS.
- `body { overflow: hidden }` di desktop + `.main-content { overflow-y: auto }` sebagai pola scrolling.

### 9.2 Warna Status
| Status | Warna | Kode |
|---|---|---|
| Hadir | Hijau | `#4CAF50` |
| Izin | Biru | `#1565C0` |
| Sakit | Kuning | `#F9A825` |
| Alfa | Merah | `#C62828` |

---

## 10. API Lengkap (Backend GAS)

### GET Actions
| Action | Parameter | Response |
|---|---|---|
| `getSantri` | `kelas` (opsional) | `{ data: [{nama, kelas, row}] }` |
| `getPresensi` | `tanggal`, `sesi`, `kelas` | `{ data: [{tanggal, sesi, nama, kelas, status, waktuInput}] }` |
| `getPresensiByDate` | `tanggal` | `{ data: [...] }` semua sesi |
| `getRekap` | `tglMulai`, `tglAkhir`, `kelas`, `nama` | `{ data: [{nama,kelas,hadir,izin,sakit,alfa,total,persentase}], libur: {} }` |
| `getLibur` | — | `{ data: [{tanggal, sesi, keterangan, row}] }` |
| `checkLibur` | `tanggal`, `sesi` | `{ libur: bool, keterangan? }` |
| `getKelas` | — | `{ data: ['A','B',...] }` — fallback `['A','B','C','D']` jika sheet tidak ada |
| `getUsers` | — | `{ data: [{username, role, kelas}] }` — password tidak dikembalikan |

### POST Actions
| Action | Body | Keterangan |
|---|---|---|
| `login` | `username`, `password` | Return `{ success, user: {username, role, kelas} }` |
| `addSantri` | `nama`, `kelas` | Tolak duplikat nama+kelas |
| `editSantri` | `namaLama`, `kelasLama`, `nama`, `kelas` | Update juga di sheet Presensi |
| `deleteSantri` | `nama`, `kelas` | — |
| `savePresensi` | `tanggal`, `sesi`, `presensi: [{nama, kelas, status}]` | Overwrite (hapus+insert) untuk tanggal+sesi+kelas |
| `addLibur` | `tanggal`, `sesi`, `keterangan` | Tolak duplikat tanggal+sesi |
| `deleteLibur` | `tanggal`, `sesi` | — |
| `addKelas` | `namaKelas` | Tolak duplikat (case-insensitive) |
| `deleteKelas` | `namaKelas` | Tolak jika ada santri di kelas ini |
| `addUser` | `username`, `password`, `role`, `kelas` | Tolak duplikat username |
| `editUser` | `oldUsername`, `username`, `password`, `role`, `kelas` | Password kosong = tidak diupdate |
| `deleteUser` | `username` | — |

### Logika Khusus Backend
- **Libur mingguan** (`handleCheckLibur`): `hari === 4 && sesi === 'Malam'` (Kamis Malam libur); `hari === 5 && sesi === 'Pagi'` (Jumat Pagi libur). Ini hardcoded, tidak dari sheet.
- **Normalisasi tanggal** (`normalizeDate`): backend menerima berbagai format tanggal dari Spreadsheet dan menormalisasi ke `YYYY-MM-DD`.
- **Fallback login**: jika sheet `Users` belum dibuat, backend fallback ke sheet `Config` untuk login admin legacy.
- **Rekap persentase backend**: `hadir / total * 100` — berbeda dengan frontend. Frontend yang dipakai untuk UI.

---

## 11. Setup Awal (Google Spreadsheet + GAS)

### Sheet yang dibutuhkan
1. **`Users`** — header baris 1: `Username | Password | Role | Kelas`. Isi minimal satu baris admin.
2. **`Santri`** — header baris 1: `Nama | Kelas`.
3. **`Presensi`** — header baris 1: `Tanggal | Sesi | Nama | Kelas | Status | WaktuInput`.
4. **`Libur`** — header baris 1: `Tanggal | Sesi | Keterangan`.
5. **`Kelas`** — header baris 1: `Nama Kelas`. Isi A2, A3, dst dengan nama kelas (A, B, C, D).

### Deploy GAS
1. Buka editor GAS, paste seluruh kode `Code.gs`.
2. Deploy -> New deployment -> Type: Web App -> Execute as: Me -> Who can access: Anyone.
3. Copy URL deployment -> paste ke `CONFIG.API_URL` di `js/config.js`.
4. Setiap update kode GAS: buat **new version** di Manage Deployments (URL tidak berubah).

---

## 12. Konvensi & Aturan Kode

- **Bahasa**: semua teks UI, nama variabel, komentar dalam **Bahasa Indonesia**.
- **XSS**: gunakan `textContent` atau `escapeHtml()` untuk semua data dari API. Hindari `innerHTML` dengan data tidak terfilter. Gunakan `createElement` + `textContent`, bukan template string untuk DOM.
- **Event listener**: gunakan `addEventListener`, bukan atribut `onclick="..."`.
- **Tanggal**: API menerima/mengembalikan `YYYY-MM-DD`. Tampilan pakai `formatDisplayDate()` dengan locale `id-ID`.
- **Values wajib tepat**: kelas (A, B, C, D), sesi (Pagi, Malam), status (Hadir, Izin, Sakit, Alfa) — harus persis sama dengan yang digunakan backend.

---

## 13. Batasan & Catatan Penting

- **Tidak ada server sendiri** — seluruh logika bisnis di GAS. Tidak ada autentikasi JWT, tidak ada session server-side.
- **Password plaintext di users.html** — disengaja untuk kesederhanaan operasional pesantren.
- **`CONFIG.KELAS` mutable** — hanya `kelas.js` yang memodifikasi. Halaman lain pakai nilai statis `config.js`. Jangan buat dependensi lintas halaman pada nilai ini.
- **sw.js tidak mencakup kelas/users pages** — jika ditambahkan fitur baru, update ASSETS di `sw.js` dan ganti nama `CACHE_NAME` agar SW diinstall ulang.
- **Tidak ada test, lint, atau CI** — verifikasi dengan buka langsung di browser atau `python3 -m http.server`.
- **CORS tidak jadi masalah** — GAS dikonfigurasi "Anyone" access.
- **Dua login handler di GAS**: `handleLogin` (GET, legacy, unreachable dari frontend) dan `handlePostLogin` (POST, aktif). Jangan hapus `handleLogin` karena sisa sistem lama.

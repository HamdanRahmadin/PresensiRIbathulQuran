# AGENTS.md

## Overview

Attendance (presensi) app for Pondok Pesantren Ribathul Quran. Pure static HTML/CSS/JS frontend — no build step, no bundler, no package manager. Backend is a Google Apps Script Web App accessed via REST.

## Architecture

- **Backend**: Google Apps Script deployed as a Web App. The URL is in `js/config.js` (`CONFIG.API_URL`). All data (santri, presensi, holidays) lives in a Google Spreadsheet behind that script.
- **Frontend**: Plain HTML pages, each loading shared scripts in this order: `config.js` → `api.js` → `auth.js` → `utils.js` → page-specific JS. This load order matters — later scripts depend on globals from earlier ones.
- **Auth**: Password-based multi-akun (Ustaz & Admin) via POST API; session state (termasuk role & kelas) disimpan di `sessionStorage` sebagai `user`. Setiap page memanggil `Auth.requireLogin()` pada `DOMContentLoaded`.
- **Role & Access Control**: Admin memiliki akses penuh. Ustaz dibatasi aksesnya hanya untuk kelas miliknya sendiri (`Auth.getAllowedKelas()`). Halaman `santri.html` dan `libur.html` dilindungi dan hanya dapat diakses oleh Admin (`Auth.isAdmin()`). Navigasi ke halaman admin disembunyikan secara otomatis via `Auth.initUI()` untuk role Ustaz.
- **PWA Support**: Aplikasi dikonfigurasi sebagai Progressive Web App dengan `manifest.json` dan `sw.js` (Service Worker) yang didaftarkan secara otomatis melalui `js/auth.js`.
- **Eksternal Libraries (CDN)**:
  - **Chart.js** (`https://cdn.jsdelivr.net/npm/chart.js`) digunakan pada `dashboard.html` untuk memvisualisasikan data kehadiran hari ini.
  - **SheetJS (xlsx)** (`https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`) digunakan pada `rekap.html` untuk mengekspor laporan rekapitulasi data kehadiran ke format Microsoft Excel (.xlsx).
- **No build/test/lint/CI**: There are no npm scripts, no tests, no linting, no CI workflows. Changes are verified by opening the HTML files in a browser.

## File map

| File | Purpose |
|---|---|
| `index.html` | Login page (entrypoint) |
| `dashboard.html` | Today's attendance stats + nav |
| `presensi.html` | Take attendance by date/session/class |
| `santri.html` | CRUD student data |
| `rekap.html` | Attendance recap/report with date range |
| `libur.html` | Manage holiday dates |
| `js/config.js` | `CONFIG` global: API URL, class list (A–D), sessions (Pagi/Malam), statuses |
| `js/api.js` | `API` global: all backend calls (GET/POST wrappers) |
| `js/auth.js` | `Auth` global: sessionStorage login guard |
| `js/utils.js` | Shared helpers: `escapeHtml()`, `formatDate()`, `formatDisplayDate()`, `showToast()`, `safeArray()` |
| `js/dashboard.js` | Dashboard page logic |
| `js/presensi.js` | Attendance input logic |
| `js/santri.js` | Student CRUD logic |
| `js/rekap.js` | Recap/report logic |
| `js/libur.js` | Holiday management logic |
| `css/style.css` | Single stylesheet, mobile-first with CSS variables |

## Key conventions

- **Language**: All UI text, variable names, and comments are in Bahasa Indonesia.
- **Global objects**: `CONFIG`, `API`, `Auth` are globals loaded via `<script>` tags. There are no modules or imports.
- **API pattern**: `API.get(action, params)` for reads, `API.post(action, body)` for writes. POST uses `Content-Type: text/plain` with JSON body (Google Apps Script quirk — do not change to `application/json`).
- **DOM IDs**: Each page relies on specific element IDs referenced in its JS file. Check the HTML before renaming or removing elements.
- **Shared helpers**: `formatDate()`, `showToast()`, `escapeHtml()`, `formatDisplayDate()`, and `safeArray()` live in `js/utils.js` — loaded by all pages. Do not duplicate these into page-specific JS files.
- **XSS prevention**: Use `textContent` or `escapeHtml()` for any user/API data inserted into the DOM. Avoid inline `onclick` with string interpolation — use `addEventListener` instead.
- **Date format**: API uses `YYYY-MM-DD` strings. Display uses `id-ID` locale formatting.
- **Classes and sessions**: Classes are `A`, `B`, `C`, `D`. Sessions are `Pagi` (morning), `Malam` (evening). Statuses are `Hadir`, `Izin`, `Sakit`, `Alfa`. These values must match exactly what the backend expects (defined in `CONFIG`).

## Gotchas

- `CONFIG.API_URL` contains a live Google Apps Script deployment URL. Do not commit alternative/test URLs without the owner's knowledge.
- POST requests use `redirect: 'follow'` because Google Apps Script redirects on POST — removing this breaks saves.
- There is no local dev server configured. Use any static file server (e.g., `python3 -m http.server`) or open HTML files directly. CORS is not an issue since the API is set to "Anyone" access.
- CSS uses a green pesantren theme via CSS variables in `:root`. Change `--primary` and related vars to re-theme, not individual color values scattered through the file.

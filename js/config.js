// ============================================================
// Konfigurasi API
// ============================================================
// Ganti URL di bawah ini dengan URL Web App Google Apps Script Anda
// Cara mendapatkan URL:
// 1. Buka Google Apps Script
// 2. Klik Deploy > New Deployment
// 3. Pilih Type: Web App
// 4. Execute as: Me
// 5. Who has access: Anyone
// 6. Klik Deploy
// 7. Copy URL yang muncul dan paste di bawah ini
// ============================================================

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz7ZhgaNv3nBBcT6K9GrHBzeg2Abv8U7pT7ArnFi2nUZMjELjoTdihU2JsO_qqlHbHheg/exec',
  APP_NAME: 'Presensi Pondok Pesantren',
  KELAS: ['A', 'B', 'C', 'D'],
  SESI: ['Pagi', 'Malam'],
  STATUS: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
  VERSION: '1.0.0'
};

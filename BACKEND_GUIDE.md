# Panduan Lengkap Update Google Apps Script (`Code.gs`)

Sesuai permintaan Anda, berikut adalah langkah-langkah detail dan kode final `Code.gs` yang sudah terintegrasi penuh dengan fitur Kelola Kelas dan Kelola Akun (Users) tanpa mengganggu sheet yang sudah ada sebelumnya.

## Langkah 1: Persiapkan Sheet Baru
Sheet yang sudah ada (`Config`, `Santri`, `Presensi`, `Libur`) **JANGAN DIHAPUS**. Anda hanya perlu menambahkan 2 sheet baru:

1.  **Buat sheet bernama `Kelas`**
    *   Tulis di kolom A1: `Nama Kelas`
    *   Di baris selanjutnya (A2, A3, dst), ketikkan kelas-kelas yang saat ini ada (misalnya ketik `A`, `B`, `C`, `D`).

2.  **Buat sheet bernama `Users`**
    *   Tulis di kolom A1: `Username`
    *   Tulis di kolom B1: `Password`
    *   Tulis di kolom C1: `Role`
    *   Tulis di kolom D1: `Kelas`
    *   **Penting**: Isi baris kedua (A2:D2) dengan akun admin Anda saat ini agar Anda tidak kesulitan login. Contoh:
        *   A2: `admin`
        *   B2: `password_anda_disini`
        *   C2: `admin`
        *   D2: *(kosongkan saja karena admin bisa akses semua kelas)*

## Langkah 2: Copy-Paste Script ke `Code.gs`
1. Buka editor Google Apps Script Anda.
2. Hapus **semua** teks/kode lama yang ada di file `Code.gs`.
3. Copy semua teks di dalam blok kode di bawah ini, dan Paste ke `Code.gs`:

```javascript
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Helper: Buka spreadsheet
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// Helper: Response JSON
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: Normalisasi Tanggal
function normalizeDate(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    var match = val.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (match) {
      var y = match[1];
      var m = ('0' + match[2]).slice(-2);
      var d = ('0' + match[3]).slice(-2);
      return y + '-' + m + '-' + d;
    }
    var parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      val = parsed;
    } else {
      return val;
    }
  }
  if (val instanceof Date) {
    var yyyy = val.getFullYear();
    var mm = ('0' + (val.getMonth() + 1)).slice(-2);
    var dd = ('0' + val.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  }
  return String(val);
}

// ============================================================
// MAIN HANDLERS
// ============================================================

function doGet(e) {
  try {
    var action = e.parameter.action;

    switch (action) {
      case 'login': return handleLogin(e.parameter);
      case 'getSantri': return handleGetSantri(e.parameter);
      case 'getPresensi': return handleGetPresensi(e.parameter);
      case 'getPresensiByDate': return handleGetPresensiByDate(e.parameter);
      case 'getRekap': return handleGetRekap(e.parameter);
      case 'getLibur': return handleGetLibur(e.parameter);
      case 'checkLibur': return handleCheckLibur(e.parameter);
      case 'getKelas': return handleGetKelas(e.parameter);
      case 'getUsers': return handleGetUsers(e.parameter);
      default: return jsonResponse({ success: false, message: 'Action tidak valid' });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var requestData = JSON.parse(jsonString);
    var action = requestData.action;
    
    var response;
    if (action === 'login') { response = handlePostLogin(requestData); }
    else if (action === 'addSantri') { response = handleAddSantri(requestData); }
    else if (action === 'editSantri') { response = handleEditSantri(requestData); }
    else if (action === 'deleteSantri') { response = handleDeleteSantri(requestData); }
    else if (action === 'savePresensi') { response = handleSavePresensi(requestData); }
    else if (action === 'addLibur') { response = handleAddLibur(requestData); }
    else if (action === 'deleteLibur') { response = handleDeleteLibur(requestData); }
    else if (action === 'addKelas') { response = handleAddKelas(requestData); }
    else if (action === 'deleteKelas') { response = handleDeleteKelas(requestData); }
    else if (action === 'addUser') { response = handleAddUser(requestData); }
    else if (action === 'editUser') { response = handleEditUser(requestData); }
    else if (action === 'deleteUser') { response = handleDeleteUser(requestData); }
    else { response = { success: false, message: 'Action not found' }; }
    
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// AUTH & USERS
// ============================================================

function handlePostLogin(data) {
  var username = data.username ? data.username.toString().trim() : "";
  var password = data.password ? data.password.toString().trim() : "";
  
  if (!username || !password) return { success: false, message: 'Username dan password harus diisi' };
  
  var sheet = getSheet("Users");
  
  // Fallback ke Config jika sheet Users belum dibuat
  if (!sheet) {
    var configSheet = getSheet('Config');
    if (configSheet) {
      var configData = configSheet.getDataRange().getValues();
      for (var j = 0; j < configData.length; j++) {
        var key = String(configData[j][0]).trim().toLowerCase();
        var value = String(configData[j][1]).trim();
        if (key === 'password' && value === password && username.toLowerCase() === 'admin') {
          return { success: true, user: { username: 'admin', role: 'admin', kelas: '' } };
        }
      }
    }
    return { success: false, message: 'Sheet Users tidak ditemukan di Spreadsheet!' };
  }
  
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var dbUsername = rows[i][0].toString().trim();
    var dbPassword = rows[i][1].toString().trim();
    var dbRole = rows[i][2].toString().trim().toLowerCase();
    var dbKelas = rows[i][3].toString().trim().toUpperCase();
    
    if (dbUsername.toLowerCase() === username.toLowerCase() && dbPassword === password) {
      return {
        success: true,
        user: {
          username: dbUsername,
          role: dbRole,
          kelas: dbRole === 'admin' ? '' : dbKelas
        }
      };
    }
  }
  return { success: false, message: 'Username atau Password salah' };
}

function handleLogin(params) {
  var sheet = getSheet('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][0]).trim().toLowerCase();
    var value = String(data[i][1]).trim();
    if (key === 'password' && value === params.password) {
      return jsonResponse({ success: true, message: 'Login berhasil' });
    }
  }
  return jsonResponse({ success: false, message: 'Password salah' });
}

function handleGetUsers() {
  var sheet = getSheet('Users');
  if (!sheet) return jsonResponse({ success: false, message: 'Sheet Users tidak ditemukan' });
  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      users.push({
        username: String(data[i][0]).trim(),
        role: String(data[i][2]).trim(),
        kelas: String(data[i][3]).trim()
      });
    }
  }
  return jsonResponse({ success: true, data: users });
}

function handleAddUser(data) {
  var sheet = getSheet('Users');
  if (!sheet) return { success: false, message: 'Sheet Users tidak ditemukan' };
  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0]).trim().toLowerCase() === String(data.username).trim().toLowerCase()) {
      return { success: false, message: 'Username sudah digunakan' };
    }
  }
  sheet.appendRow([data.username, data.password, data.role, data.kelas]);
  return { success: true, message: 'Akun berhasil ditambahkan' };
}

function handleEditUser(data) {
  var sheet = getSheet('Users');
  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0]).trim() === String(data.oldUsername).trim()) {
      sheet.getRange(i + 1, 1).setValue(data.username);
      if (data.password) {
        sheet.getRange(i + 1, 2).setValue(data.password);
      }
      sheet.getRange(i + 1, 3).setValue(data.role);
      sheet.getRange(i + 1, 4).setValue(data.role === 'admin' ? '' : data.kelas);
      return { success: true, message: 'Akun berhasil diperbarui' };
    }
  }
  return { success: false, message: 'Akun tidak ditemukan' };
}

function handleDeleteUser(data) {
  var sheet = getSheet('Users');
  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0]).trim() === String(data.username).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Akun berhasil dihapus' };
    }
  }
  return { success: false, message: 'Akun tidak ditemukan' };
}

// ============================================================
// KELAS
// ============================================================

function handleGetKelas() {
  var sheet = getSheet('Kelas');
  if (!sheet) return jsonResponse({ success: true, data: ['A', 'B', 'C', 'D'] }); // Fallback
  var data = sheet.getDataRange().getValues();
  var kelas = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) kelas.push(String(data[i][0]).trim());
  }
  return jsonResponse({ success: true, data: kelas });
}

function handleAddKelas(data) {
  var sheet = getSheet('Kelas');
  if (!sheet) return { success: false, message: 'Sheet Kelas tidak ditemukan' };
  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0]).trim().toLowerCase() === String(data.namaKelas).trim().toLowerCase()) {
      return { success: false, message: 'Kelas sudah ada' };
    }
  }
  sheet.appendRow([data.namaKelas]);
  return { success: true, message: 'Kelas berhasil ditambahkan' };
}

function handleDeleteKelas(data) {
  var sheet = getSheet('Kelas');
  if (!sheet) return { success: false, message: 'Sheet Kelas tidak ditemukan' };
  
  // Cek apakah ada santri di kelas ini
  var santriSheet = getSheet('Santri');
  if (santriSheet) {
    var santriData = santriSheet.getDataRange().getValues();
    for (var j = 1; j < santriData.length; j++) {
      if (String(santriData[j][1]).trim() === String(data.namaKelas).trim()) {
        return { success: false, message: 'Kelas tidak bisa dihapus karena masih ada santri di dalamnya' };
      }
    }
  }

  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0]).trim() === String(data.namaKelas).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Kelas berhasil dihapus' };
    }
  }
  return { success: false, message: 'Kelas tidak ditemukan' };
}

// ============================================================
// SANTRI CRUD
// ============================================================

function handleGetSantri(params) {
  var sheet = getSheet('Santri');
  var data = sheet.getDataRange().getValues();
  var santri = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] !== '') {
      var item = {
        nama: data[i][0],
        kelas: data[i][1],
        row: i + 1
      };

      if (params.kelas && params.kelas !== '' && params.kelas !== 'semua') {
        if (data[i][1] === params.kelas) {
          santri.push(item);
        }
      } else {
        santri.push(item);
      }
    }
  }

  santri.sort(function (a, b) {
    if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
    return a.nama.localeCompare(b.nama);
  });

  return jsonResponse({ success: true, data: santri });
}

function handleAddSantri(data) {
  var sheet = getSheet('Santri');
  var existing = sheet.getDataRange().getValues();

  for (var i = 1; i < existing.length; i++) {
    if (existing[i][0].toString().toLowerCase() === data.nama.toLowerCase() &&
      existing[i][1] === data.kelas) {
      return { success: false, message: 'Santri dengan nama dan kelas yang sama sudah ada' };
    }
  }

  sheet.appendRow([data.nama, data.kelas]);
  return { success: true, message: 'Santri berhasil ditambahkan' };
}

function handleEditSantri(data) {
  var sheet = getSheet('Santri');
  var existing = sheet.getDataRange().getValues();
  var targetRow = -1;

  for (var i = 1; i < existing.length; i++) {
    if (existing[i][0] === data.namaLama && existing[i][1] === data.kelasLama) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, message: 'Santri tidak ditemukan' };
  }

  if (data.nama !== data.namaLama || data.kelas !== data.kelasLama) {
    for (var j = 1; j < existing.length; j++) {
      if (existing[j][0].toString().toLowerCase() === data.nama.toLowerCase() &&
        existing[j][1] === data.kelas) {
        return { success: false, message: 'Santri dengan nama dan kelas yang sama sudah ada' };
      }
    }
  }

  sheet.getRange(targetRow, 1).setValue(data.nama);
  sheet.getRange(targetRow, 2).setValue(data.kelas);

  if (data.nama !== data.namaLama || data.kelas !== data.kelasLama) {
    var presensiSheet = getSheet('Presensi');
    var presensiData = presensiSheet.getDataRange().getValues();
    for (var k = 1; k < presensiData.length; k++) {
      if (presensiData[k][2] === data.namaLama && presensiData[k][3] === data.kelasLama) {
        presensiSheet.getRange(k + 1, 3).setValue(data.nama);
        presensiSheet.getRange(k + 1, 4).setValue(data.kelas);
      }
    }
  }

  return { success: true, message: 'Santri berhasil diperbarui' };
}

function handleDeleteSantri(data) {
  var sheet = getSheet('Santri');
  var existing = sheet.getDataRange().getValues();

  for (var i = existing.length - 1; i >= 1; i--) {
    if (existing[i][0] === data.nama && existing[i][1] === data.kelas) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Santri berhasil dihapus' };
    }
  }

  return { success: false, message: 'Santri tidak ditemukan' };
}

// ============================================================
// PRESENSI
// ============================================================

function handleSavePresensi(data) {
  var sheet = getSheet('Presensi');
  var tanggal = data.tanggal;
  var sesi = data.sesi;
  var presensiList = data.presensi;
  var waktuInput = new Date().toLocaleTimeString('id-ID');

  var existing = sheet.getDataRange().getValues();
  var kelasTarget = presensiList.length > 0 ? presensiList[0].kelas : '';

  for (var i = existing.length - 1; i >= 1; i--) {
    var tgl = normalizeDate(existing[i][0]);
    if (tgl === tanggal && String(existing[i][1]).trim() === sesi && String(existing[i][3]).trim() === kelasTarget) {
      sheet.deleteRow(i + 1);
    }
  }

  for (var j = 0; j < presensiList.length; j++) {
    var p = presensiList[j];
    sheet.appendRow([tanggal, sesi, p.nama, p.kelas, p.status, waktuInput]);
  }

  return { success: true, message: 'Presensi berhasil disimpan' };
}

function handleGetPresensi(params) {
  var sheet = getSheet('Presensi');
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var tgl = normalizeDate(data[i][0]);

    var match = true;
    if (params.tanggal && tgl !== params.tanggal) match = false;
    if (params.sesi && String(data[i][1]).trim() !== params.sesi) match = false;
    if (params.kelas && String(data[i][3]).trim() !== params.kelas) match = false;

    if (match) {
      result.push({
        tanggal: tgl,
        sesi: String(data[i][1]).trim(),
        nama: String(data[i][2]).trim(),
        kelas: String(data[i][3]).trim(),
        status: String(data[i][4]).trim(),
        waktuInput: data[i][5]
      });
    }
  }

  return jsonResponse({ success: true, data: result });
}

function handleGetPresensiByDate(params) {
  var sheet = getSheet('Presensi');
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var tgl = normalizeDate(data[i][0]);

    if (tgl === params.tanggal) {
      result.push({
        tanggal: tgl,
        sesi: String(data[i][1]).trim(),
        nama: String(data[i][2]).trim(),
        kelas: String(data[i][3]).trim(),
        status: String(data[i][4]).trim(),
        waktuInput: data[i][5]
      });
    }
  }

  return jsonResponse({ success: true, data: result });
}

// ============================================================
// REKAP
// ============================================================

function handleGetRekap(params) {
  var sheet = getSheet('Presensi');
  var data = sheet.getDataRange().getValues();

  var tglMulai = params.tglMulai || '2000-01-01';
  var tglAkhir = params.tglAkhir || '2099-12-31';
  var filterKelas = params.kelas || '';
  var filterNama = params.nama || '';

  var liburSheet = getSheet('Libur');
  var liburData = liburSheet.getDataRange().getValues();
  var liburMap = {};
  for (var l = 1; l < liburData.length; l++) {
    var liburTgl = normalizeDate(liburData[l][0]);
    var liburSesi = String(liburData[l][1]).trim();
    var liburKey = liburTgl + '_' + liburSesi;
    liburMap[liburKey] = liburData[l][2];
  }

  var rekap = {};

  for (var i = 1; i < data.length; i++) {
    var tgl = normalizeDate(data[i][0]);
    if (tgl < tglMulai || tgl > tglAkhir) continue;

    var nama = String(data[i][2]).trim();
    var kelas = String(data[i][3]).trim();
    var status = String(data[i][4]).trim();

    if (filterKelas && filterKelas !== '' && filterKelas !== 'semua' && kelas !== filterKelas) continue;
    if (filterNama && filterNama !== '' && nama.toLowerCase().indexOf(filterNama.toLowerCase()) === -1) continue;

    var key = nama + '_' + kelas;
    if (!rekap[key]) {
      rekap[key] = {
        nama: nama,
        kelas: kelas,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alfa: 0,
        total: 0
      };
    }

    rekap[key].total++;
    switch (status) {
      case 'Hadir': rekap[key].hadir++; break;
      case 'Izin': rekap[key].izin++; break;
      case 'Sakit': rekap[key].sakit++; break;
      case 'Alfa': rekap[key].alfa++; break;
    }
  }

  var result = [];
  for (var k in rekap) {
    var r = rekap[k];
    r.persentase = r.total > 0 ? Math.round((r.hadir / r.total) * 100) : 0;
    result.push(r);
  }

  result.sort(function (a, b) {
    if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
    return a.nama.localeCompare(b.nama);
  });

  return jsonResponse({ success: true, data: result, libur: liburMap });
}

// ============================================================
// LIBUR
// ============================================================

function handleGetLibur(params) {
  var sheet = getSheet('Libur');
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var tgl = normalizeDate(data[i][0]);
    if (data[i][0] !== '') {
      result.push({
        tanggal: tgl,
        sesi: String(data[i][1]).trim(),
        keterangan: String(data[i][2]).trim(),
        row: i + 1
      });
    }
  }

  result.sort(function (a, b) {
    return b.tanggal.localeCompare(a.tanggal);
  });

  return jsonResponse({ success: true, data: result });
}

function handleAddLibur(data) {
  var sheet = getSheet('Libur');
  var existing = sheet.getDataRange().getValues();

  for (var i = 1; i < existing.length; i++) {
    var tgl = normalizeDate(existing[i][0]);
    if (tgl === data.tanggal && String(existing[i][1]).trim() === data.sesi) {
      return { success: false, message: 'Hari libur untuk tanggal dan sesi ini sudah ada' };
    }
  }

  sheet.appendRow([data.tanggal, data.sesi, data.keterangan]);
  return { success: true, message: 'Hari libur berhasil ditambahkan' };
}

function handleDeleteLibur(data) {
  var sheet = getSheet('Libur');
  var existing = sheet.getDataRange().getValues();

  for (var i = existing.length - 1; i >= 1; i--) {
    var tgl = normalizeDate(existing[i][0]);
    if (tgl === data.tanggal && String(existing[i][1]).trim() === data.sesi) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Hari libur berhasil dihapus' };
    }
  }

  return { success: false, message: 'Data libur tidak ditemukan' };
}

function handleCheckLibur(params) {
  var tanggal = params.tanggal;
  var sesi = params.sesi;

  var dateObj = new Date(tanggal);
  var hari = dateObj.getDay();

  if (hari === 4 && sesi === 'Malam') {
    return jsonResponse({ success: true, libur: true, keterangan: 'Libur Mingguan (Kamis Malam)' });
  }
  if (hari === 5 && sesi === 'Pagi') {
    return jsonResponse({ success: true, libur: true, keterangan: 'Libur Mingguan (Jumat Pagi)' });
  }

  var sheet = getSheet('Libur');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var tgl = normalizeDate(data[i][0]);
    var sesiRow = String(data[i][1]).trim();
    if (tgl === tanggal && (sesiRow === sesi || sesiRow === 'Semua')) {
      return jsonResponse({ success: true, libur: true, keterangan: String(data[i][2]).trim() });
    }
  }

  return jsonResponse({ success: true, libur: false });
}
```

## Langkah 3: Deploy Ulang (WAJIB)
Tanpa langkah ini, Google Apps Script akan tetap mengeksekusi versi script Anda yang lama.

1. Di kanan atas editor Apps Script, klik tombol biru **Deploy** lalu pilih **Manage deployments**.
2. Anda akan melihat jendela popup dengan daftar deployment. Klik **Ikon Pensil (Edit)** di sebelah nama deployment Anda.
3. Di bagian **Version**, klik dropdown yang bertuliskan angka versi saat ini (misal *Version 1*), lalu pilih **New version** (versi baru).
4. Klik tombol **Deploy** di bagian bawah.
5. Tunggu prosesnya selesai. Setelah selesai, URL tidak akan berubah, tapi script Anda sudah resmi ter-update!

## Langkah 4: Selesai!
Sekarang Anda bisa mencoba kembali aplikasi Anda di browser. Cobalah login dengan akun admin Anda dan buka menu **Kelola Akun** serta **Kelola Kelas**.

// ============================================================
// Presensi - Logic Input Presensi
// ============================================================

let currentSesi = 'Pagi';
let currentKelas = CONFIG.KELAS.length > 0 ? CONFIG.KELAS[0] : '';
let santriList = [];
let isLibur = false;
let loadRequestId = 0; // untuk mendeteksi response basi (race condition)

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  
  // Cegah Admin mengakses halaman ini (sesuai permintaan, presensi khusus Ustaz)
  if (Auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  initPresensi();
});

function initPresensi() {
  // Set tanggal hari ini
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('headerDate').textContent = today.toLocaleDateString('id-ID', options);

  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  const btnSave = document.getElementById('btnSave');
  if (btnSave) {
    btnSave.addEventListener('click', savePresensi);
  }

  const tanggalInput = document.getElementById('tanggal');
  tanggalInput.value = formatDate(today);
  tanggalInput.addEventListener('change', () => loadSantri());

  // Setup sesi tabs
  document.querySelectorAll('#sesiTabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#sesiTabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSesi = tab.dataset.sesi;
      loadSantri();
    });
  });

  // Setup kelas tabs berdasarkan hak akses
  const allowedKelas = Auth.getAllowedKelas();
  
  if (allowedKelas !== 'all') {
    // Jika ustaz, render tab hanya untuk kelasnya
    const container = document.getElementById('kelasTabsContainer');
    if (container) {
      container.innerHTML = `<button class="filter-tab active" data-kelas="${allowedKelas}">Kelas ${allowedKelas}</button>`;
      currentKelas = allowedKelas;
    }
  } else {
    // Jika admin, render semua tab kelas dinamis tanpa tombol "Semua"
    renderKelasTabs('kelasTabsContainer', false, (kelas) => {
      currentKelas = kelas;
      loadSantri();
    });
  }

  loadSantri();
}

async function loadSantri() {
  const tanggal = document.getElementById('tanggal').value;
  if (!tanggal) return;

  // Increment request ID untuk mendeteksi response basi
  const thisRequestId = ++loadRequestId;

  document.getElementById('presensiLoading').classList.remove('hidden');
  document.getElementById('presensiList').innerHTML = '';
  document.getElementById('saveSection').classList.add('hidden');
  document.getElementById('liburBanner').classList.add('hidden');

  // Cek apakah hari libur
  const liburResult = await API.checkLibur(tanggal, currentSesi);
  if (thisRequestId !== loadRequestId) return; // response basi, abaikan

  if (liburResult.success && liburResult.libur) {
    isLibur = true;
    document.getElementById('liburBanner').classList.remove('hidden');
    document.getElementById('liburText').textContent = liburResult.keterangan;
    document.getElementById('presensiLoading').classList.add('hidden');
    return;
  }
  isLibur = false;

  // Ambil data santri dan presensi secara parallel
  const [santriResult, presensiResult] = await Promise.all([
    API.getSantri(currentKelas),
    API.getPresensi(tanggal, currentSesi, currentKelas)
  ]);
  if (thisRequestId !== loadRequestId) return; // response basi, abaikan

  document.getElementById('presensiLoading').classList.add('hidden');

  if (!santriResult.success) {
    document.getElementById('presensiList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data santri: ${escapeHtml(santriResult.message || '')}</div>
      </div>
    `;
    showToast(santriResult.message || 'Gagal memuat data santri', 'error');
    return;
  }

  const santriData = safeArray(santriResult);

  if (santriData.length === 0) {
    document.getElementById('presensiList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128100;</div>
        <div class="empty-text">Belum ada santri di Kelas ${escapeHtml(currentKelas)}</div>
      </div>
    `;
    return;
  }

  santriList = santriData;

  // Buat mapping presensi yang sudah ada
  const existingPresensi = {};
  const presensiData = safeArray(presensiResult);
  presensiData.forEach(p => {
    existingPresensi[p.nama] = p.status;
  });

  // Render daftar santri menggunakan DOM API (aman dari XSS)
  const listEl = document.getElementById('presensiList');
  listEl.innerHTML = '';

  santriList.forEach((s, index) => {
    const existingStatus = existingPresensi[s.nama] || 'Hadir';
    // Validasi status terhadap CONFIG
    const validStatus = CONFIG.STATUS.includes(existingStatus) ? existingStatus : 'Hadir';
    const statusClass = 'status-' + validStatus.toLowerCase();

    const item = document.createElement('div');
    item.className = 'presensi-item';

    const info = document.createElement('div');
    info.className = 'santri-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'santri-name';
    nameEl.textContent = s.nama;

    const classEl = document.createElement('div');
    classEl.className = 'santri-class';
    classEl.textContent = `Kelas ${s.kelas}`;

    info.appendChild(nameEl);
    info.appendChild(classEl);

    const select = document.createElement('select');
    select.className = `status-select ${statusClass}`;
    select.dataset.index = index;
    select.addEventListener('change', function() {
      updateStatusColor(this);
    });

    CONFIG.STATUS.forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      if (status === validStatus) option.selected = true;
      select.appendChild(option);
    });

    item.appendChild(info);
    item.appendChild(select);
    listEl.appendChild(item);
  });

  document.getElementById('saveSection').classList.remove('hidden');
} // end loadSantri

function updateStatusColor(selectEl) {
  selectEl.className = 'status-select status-' + selectEl.value.toLowerCase();
}

async function savePresensi() {
  const tanggal = document.getElementById('tanggal').value;
  const btn = document.getElementById('btnSave');

  if (!tanggal) {
    showToast('Pilih tanggal terlebih dahulu', 'error');
    return;
  }

  if (santriList.length === 0) {
    showToast('Tidak ada santri untuk diabsen', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const presensi = [];
  document.querySelectorAll('.status-select').forEach((sel, index) => {
    if (index < santriList.length) {
      presensi.push({
        nama: santriList[index].nama,
        kelas: santriList[index].kelas,
        status: sel.value
      });
    }
  });

  const result = await API.savePresensi(tanggal, currentSesi, presensi);

  btn.disabled = false;
  btn.textContent = 'Simpan Presensi';

  if (result.success) {
    showToast('Presensi berhasil disimpan!', 'success');
  } else {
    showToast(result.message || 'Gagal menyimpan presensi', 'error');
  }
}

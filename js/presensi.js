// ============================================================
// Presensi - Logic Input Presensi
// ============================================================

let currentSesi = 'Pagi';
let currentKelas = 'A';
let santriList = [];
let isLibur = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  initPresensi();
});

function initPresensi() {
  // Set tanggal hari ini
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('headerDate').textContent = today.toLocaleDateString('id-ID', options);

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

  // Setup kelas tabs
  document.querySelectorAll('#kelasTabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#kelasTabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentKelas = tab.dataset.kelas;
      loadSantri();
    });
  });

  loadSantri();
}

async function loadSantri() {
  const tanggal = document.getElementById('tanggal').value;

  document.getElementById('presensiLoading').classList.remove('hidden');
  document.getElementById('presensiList').innerHTML = '';
  document.getElementById('saveSection').classList.add('hidden');
  document.getElementById('bulkCard').style.display = 'none';
  document.getElementById('liburBanner').classList.add('hidden');

  // Cek apakah hari libur
  const liburResult = await API.checkLibur(tanggal, currentSesi);
  if (liburResult.success && liburResult.libur) {
    isLibur = true;
    document.getElementById('liburBanner').classList.remove('hidden');
    document.getElementById('liburText').textContent = liburResult.keterangan;
    document.getElementById('presensiLoading').classList.add('hidden');
    return;
  }
  isLibur = false;

  // Ambil data santri berdasarkan kelas
  const santriResult = await API.getSantri(currentKelas);

  // Ambil data presensi yang sudah ada (jika edit)
  const presensiResult = await API.getPresensi(tanggal, currentSesi, currentKelas);

  document.getElementById('presensiLoading').classList.add('hidden');

  if (!santriResult.success || santriResult.data.length === 0) {
    document.getElementById('presensiList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128100;</div>
        <div class="empty-text">Belum ada santri di Kelas ${currentKelas}</div>
      </div>
    `;
    return;
  }

  santriList = santriResult.data;

  // Buat mapping presensi yang sudah ada
  const existingPresensi = {};
  if (presensiResult.success && presensiResult.data.length > 0) {
    presensiResult.data.forEach(p => {
      existingPresensi[p.nama] = p.status;
    });
  }

  // Render daftar santri
  let html = '';
  santriList.forEach((s, index) => {
    const existingStatus = existingPresensi[s.nama] || 'Hadir';
    const statusClass = 'status-' + existingStatus.toLowerCase();

    html += `
      <div class="presensi-item">
        <div class="santri-info">
          <div class="santri-name">${s.nama}</div>
          <div class="santri-class">Kelas ${s.kelas}</div>
        </div>
        <select class="status-select ${statusClass}" data-index="${index}" onchange="updateStatusColor(this)">
          <option value="Hadir" ${existingStatus === 'Hadir' ? 'selected' : ''}>Hadir</option>
          <option value="Izin" ${existingStatus === 'Izin' ? 'selected' : ''}>Izin</option>
          <option value="Sakit" ${existingStatus === 'Sakit' ? 'selected' : ''}>Sakit</option>
          <option value="Alfa" ${existingStatus === 'Alfa' ? 'selected' : ''}>Alfa</option>
        </select>
      </div>
    `;
  });

  document.getElementById('presensiList').innerHTML = html;
  document.getElementById('saveSection').classList.remove('hidden');
  document.getElementById('bulkCard').style.display = 'block';
}

function updateStatusColor(selectEl) {
  selectEl.className = 'status-select status-' + selectEl.value.toLowerCase();
}

function setAllStatus(status) {
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.value = status;
    updateStatusColor(sel);
  });
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
    presensi.push({
      nama: santriList[index].nama,
      kelas: santriList[index].kelas,
      status: sel.value
    });
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

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

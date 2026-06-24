// ============================================================
// Rekap - Logic Rekap/Laporan Kehadiran
// ============================================================

let rekapKelas = 'semua';

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  initRekap();
});

function initRekap() {
  // Set default tanggal: awal bulan ini s/d hari ini
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  document.getElementById('tglMulai').value = formatDate(firstDay);
  document.getElementById('tglAkhir').value = formatDate(today);

  // Setup kelas filter
  document.querySelectorAll('#kelasFilter .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#kelasFilter .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      rekapKelas = tab.dataset.kelas;
    });
  });
}

async function loadRekap() {
  const tglMulai = document.getElementById('tglMulai').value;
  const tglAkhir = document.getElementById('tglAkhir').value;
  const filterNama = document.getElementById('filterNama').value.trim();

  if (!tglMulai || !tglAkhir) {
    showToast('Pilih rentang tanggal terlebih dahulu', 'error');
    return;
  }

  if (tglMulai > tglAkhir) {
    showToast('Tanggal mulai harus sebelum tanggal akhir', 'error');
    return;
  }

  document.getElementById('rekapLoading').classList.remove('hidden');
  document.getElementById('rekapContent').innerHTML = '';
  document.getElementById('rekapStats').classList.add('hidden');

  const result = await API.getRekap(tglMulai, tglAkhir, rekapKelas, filterNama);

  document.getElementById('rekapLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('rekapContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat rekap: ${result.message}</div>
      </div>
    `;
    return;
  }

  const data = result.data;

  if (data.length === 0) {
    document.getElementById('rekapContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128203;</div>
        <div class="empty-text">Tidak ada data presensi untuk periode ini</div>
      </div>
    `;
    return;
  }

  // Hitung total statistik
  let totalHadir = 0, totalIzin = 0, totalSakit = 0, totalAlfa = 0;
  data.forEach(r => {
    totalHadir += r.hadir;
    totalIzin += r.izin;
    totalSakit += r.sakit;
    totalAlfa += r.alfa;
  });

  document.getElementById('rStatHadir').textContent = totalHadir;
  document.getElementById('rStatIzin').textContent = totalIzin;
  document.getElementById('rStatSakit').textContent = totalSakit;
  document.getElementById('rStatAlfa').textContent = totalAlfa;
  document.getElementById('rekapStats').classList.remove('hidden');

  // Render tabel
  let html = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128203;</span> Detail Rekap
        <span class="count-badge">${data.length} santri</span>
      </div>
      <div class="date-info mb-2">
        ${formatDisplayDate(tglMulai)} s/d ${formatDisplayDate(tglAkhir)}
      </div>
      <div class="rekap-table-container">
        <table class="rekap-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Hadir</th>
              <th>Izin</th>
              <th>Sakit</th>
              <th>Alfa</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
  `;

  data.forEach(r => {
    const pctClass = r.persentase >= 80 ? 'high' : (r.persentase >= 60 ? 'medium' : 'low');
    html += `
      <tr>
        <td>${r.nama}</td>
        <td>${r.kelas}</td>
        <td><span class="badge badge-hadir">${r.hadir}</span></td>
        <td><span class="badge badge-izin">${r.izin}</span></td>
        <td><span class="badge badge-sakit">${r.sakit}</span></td>
        <td><span class="badge badge-alfa">${r.alfa}</span></td>
        <td>
          <strong>${r.persentase}%</strong>
          <div class="percentage-bar">
            <div class="percentage-fill ${pctClass}" style="width: ${r.persentase}%"></div>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('rekapContent').innerHTML = html;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
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

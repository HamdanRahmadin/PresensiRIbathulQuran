// ============================================================
// Dashboard - Logic
// ============================================================

let todayChartInstance = null;
let weeklyChartInstance = null;
let allTodayData = []; // cache data statistik hari ini (setelah filter kelas)

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  initDashboard();
});

function initDashboard() {
  // Set tanggal hari ini
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('headerDate').textContent = today.toLocaleDateString('id-ID', options);

  // Close modal button listener
  const closeBtn = document.getElementById('closeAlfaBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAlfaModal);
  }

  loadTodayStats();
  setupSesiStatsTabs();
  loadWeeklyStats();
}

async function loadTodayStats() {
  const today = formatDate(new Date());
  const result = await API.getPresensiByDate(today);

  document.getElementById('statsLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('presensiInfo').textContent = 'Gagal memuat data. Periksa koneksi internet.';
    showToast(result.message || 'Gagal memuat statistik', 'error');
    return;
  }

  document.getElementById('statsContent').classList.remove('hidden');

  let data = safeArray(result);
  const allowedKelas = Auth.getAllowedKelas();

  // Jika ustaz, filter data presensi hari ini untuk kelasnya saja
  if (allowedKelas !== 'all') {
    data = data.filter(item => item.kelas === allowedKelas);
  }

  // Cache hasil setelah filter kelas
  allTodayData = data;

  renderTodayBySesi('semua');
}

function renderTodayBySesi(sesi) {
  let data = allTodayData;

  // Filter berdasarkan sesi jika bukan 'semua'
  if (sesi !== 'semua') {
    data = data.filter(item => item.sesi === sesi);
  }

  if (data.length > 0) {
    const stats = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 };
    const sesiSet = new Set();

    data.forEach(item => {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++;
      }
      sesiSet.add(item.sesi);
    });

    document.getElementById('statHadir').textContent = stats.Hadir;
    document.getElementById('statIzin').textContent = stats.Izin;
    document.getElementById('statSakit').textContent = stats.Sakit;
    document.getElementById('statAlfa').textContent = stats.Alfa;

    const sesiLabel = sesi !== 'semua' ? sesi : Array.from(sesiSet).join(' & ');
    const total = data.length;
    const kelasSuffix = Auth.getAllowedKelas() !== 'all' ? ` (Kelas ${Auth.getAllowedKelas()})` : '';
    document.getElementById('presensiInfo').textContent =
      `${total} data presensi${kelasSuffix} (Sesi: ${sesiLabel})`;

    document.getElementById('chartContainer').classList.remove('hidden');
    renderTodayChart(stats);

  } else {
    const kelasSuffix = Auth.getAllowedKelas() !== 'all' ? ` di Kelas ${Auth.getAllowedKelas()}` : '';
    const sesiSuffix = sesi !== 'semua' ? ` (Sesi ${sesi})` : '';
    document.getElementById('presensiInfo').textContent = `Belum ada presensi${sesiSuffix}${kelasSuffix}`;
    document.getElementById('chartContainer').classList.add('hidden');
  }
}

function setupSesiStatsTabs() {
  const tabs = document.querySelectorAll('#sesiStatsTabs .filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTodayBySesi(tab.dataset.sesi);
    });
  });
}

/**
 * Render Doughnut Chart untuk statistik hari ini
 */
function renderTodayChart(stats) {
  const ctx = document.getElementById('todayChart').getContext('2d');

  // Hancurkan chart sebelumnya jika ada
  if (todayChartInstance) {
    todayChartInstance.destroy();
  }

  // Gunakan warna bertema pesantren sesuai CSS variable
  todayChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
      datasets: [{
        data: [stats.Hadir, stats.Izin, stats.Sakit, stats.Alfa],
        backgroundColor: [
          '#4CAF50', // Hadir (green)
          '#1565C0', // Izin (blue)
          '#F9A825', // Sakit (yellow)
          '#C62828'  // Alfa (red)
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: {
              family: 'Segoe UI',
              size: 11
            },
            padding: 8
          }
        }
      },
      cutout: '60%'
    }
  });
}

/**
 * Muat statistik presensi 3 hari terakhir
 */
async function loadWeeklyStats() {
  const allowedKelas = Auth.getAllowedKelas();
  const today = new Date();

  // Reset UI loading state
  document.getElementById('weeklyChartContainer').classList.add('hidden');
  document.getElementById('weeklyEmptyState').classList.add('hidden');
  document.getElementById('weeklyLoading').classList.remove('hidden');

  // Generate 3 tanggal terakhir (hari ini dan 2 hari sebelumnya)
  const dates = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }

  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Fetch data untuk 3 hari secara parallel
  const results = await Promise.all(
    dates.map(date => API.getPresensiByDate(date))
  );

  document.getElementById('weeklyLoading').classList.add('hidden');

  const dailyData = [];

  results.forEach((result, idx) => {
    let data = safeArray(result);
    const dateStr = dates[idx];

    // Filter kelas untuk ustaz
    if (allowedKelas !== 'all') {
      data = data.filter(item => item.kelas === allowedKelas);
    }

    const stats = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 };
    const alfaList = []; // [{nama, sesi}, ...]

    data.forEach(item => {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++;
      }
      if (item.status === 'Alfa') {
        alfaList.push({ nama: item.nama, sesi: item.sesi });
      }
    });

    const total = stats.Hadir + stats.Izin + stats.Sakit + stats.Alfa;
    const present = stats.Hadir + stats.Izin + stats.Sakit;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const d = new Date(dateStr + 'T00:00:00');
    dailyData.push({
      label: dayLabels[d.getDay()],
      date: dateStr,
      percentage,
      present,
      total,
      alfaCount: alfaList.length,
      alfaList
    });
  });

  const hasData = dailyData.some(d => d.total > 0);

  if (hasData) {
    document.getElementById('weeklyChartContainer').classList.remove('hidden');
    document.getElementById('weeklyEmptyState').classList.add('hidden');
    renderWeeklyChart(dailyData);
  } else {
    document.getElementById('weeklyChartContainer').classList.add('hidden');
    document.getElementById('weeklyEmptyState').classList.remove('hidden');
  }
}

function renderWeeklyChart(dailyData) {
  const ctx = document.getElementById('weeklyChart').getContext('2d');

  if (weeklyChartInstance) {
    weeklyChartInstance.destroy();
  }

  weeklyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dailyData.map(d => d.label),
      datasets: [{
        label: 'Kehadiran',
        data: dailyData.map(d => d.percentage),
        backgroundColor: '#4CAF50',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const item = dailyData[idx];
          openAlfaModal(item.label, item.alfaList);
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = dailyData[context.dataIndex];
              if (item.total === 0) {
                return ' Belum ada data presensi';
              }
              let text = ` Kehadiran: ${item.percentage}% (${item.present}/${item.total} Santri)`;
              if (item.alfaCount > 0) {
                text += ` | ${item.alfaCount} Alfa`;
              }
              text += ' - Klik untuk detail';
              return text;
            }
          }
        }
      }
    }
  });
}

function openAlfaModal(dayLabel, alfaList) {
  document.getElementById('alfaModalTitle').textContent = `Santri Tidak Hadir - ${dayLabel}`;
  const body = document.getElementById('alfaModalBody');

  if (alfaList.length === 0) {
    body.innerHTML = '<p style="text-align:center;color:var(--text-light);">Semua santri hadir pada hari ini</p>';
  } else {
    // Kelompokkan per sesi
    const pagi = alfaList.filter(a => a.sesi === 'Pagi');
    const malam = alfaList.filter(a => a.sesi === 'Malam');

    let html = '';
    if (pagi.length > 0) {
      html += '<div class="modal-sesi"><strong>Sesi Pagi</strong></div>';
      pagi.forEach(a => {
        html += `<div class="modal-item">${escapeHtml(a.nama)}</div>`;
      });
    }
    if (malam.length > 0) {
      if (html) html += '<hr>';
      html += '<div class="modal-sesi"><strong>Sesi Malam</strong></div>';
      malam.forEach(a => {
        html += `<div class="modal-item">${escapeHtml(a.nama)}</div>`;
      });
    }
    body.innerHTML = html;
  }

  document.getElementById('alfaModal').classList.remove('hidden');
}

function closeAlfaModal() {
  document.getElementById('alfaModal').classList.add('hidden');
}

// Tutup modal saat klik overlay di luar konten
document.addEventListener('click', (e) => {
  const modal = document.getElementById('alfaModal');
  if (modal && !modal.classList.contains('hidden') && e.target === modal) {
    closeAlfaModal();
  }
});

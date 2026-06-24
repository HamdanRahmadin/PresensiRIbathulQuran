// ============================================================
// Dashboard - Logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  initDashboard();
});

function initDashboard() {
  // Set tanggal hari ini
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('headerDate').textContent = today.toLocaleDateString('id-ID', options);

  loadTodayStats();
}

async function loadTodayStats() {
  const today = formatDate(new Date());
  const result = await API.getPresensiByDate(today);

  document.getElementById('statsLoading').classList.add('hidden');
  document.getElementById('statsContent').classList.remove('hidden');

  if (result.success && result.data.length > 0) {
    const stats = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 };
    const sesiSet = new Set();

    result.data.forEach(item => {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++;
      }
      sesiSet.add(item.sesi);
    });

    document.getElementById('statHadir').textContent = stats.Hadir;
    document.getElementById('statIzin').textContent = stats.Izin;
    document.getElementById('statSakit').textContent = stats.Sakit;
    document.getElementById('statAlfa').textContent = stats.Alfa;

    const sesiList = Array.from(sesiSet).join(' & ');
    const total = result.data.length;
    document.getElementById('presensiInfo').textContent =
      `${total} data presensi (Sesi: ${sesiList})`;
  } else {
    document.getElementById('presensiInfo').textContent = 'Belum ada presensi hari ini';
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

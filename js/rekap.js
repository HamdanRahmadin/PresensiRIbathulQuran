// ============================================================
// Rekap - Logic Rekap/Laporan Kehadiran
// ============================================================

let rekapKelas = 'semua';
let currentRekapData = []; // Untuk menyimpan data ekspor Excel

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  if (!Auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }
  initRekap();
});

function initRekap() {
  // Setup click listener for back button
  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // Set default tanggal: awal bulan ini s/d hari ini
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  document.getElementById('tglMulai').value = formatDate(firstDay);
  document.getElementById('tglAkhir').value = formatDate(today);

  // Setup kelas filter untuk admin
  renderKelasTabs('kelasTabsContainer', true, (kelas) => {
    rekapKelas = kelas;
  });

  // Setup click listeners
  const btnShowRekap = document.getElementById('btnShowRekap');
  if (btnShowRekap) {
    btnShowRekap.addEventListener('click', loadRekap);
  }

  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', exportToExcel);
  }
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

  const kelas = rekapKelas === 'semua' ? '' : rekapKelas;
  const result = await API.getRekap(tglMulai, tglAkhir, kelas, filterNama);

  document.getElementById('rekapLoading').classList.add('hidden');
  document.getElementById('btnExport').classList.add('hidden');

  if (!result.success) {
    document.getElementById('rekapContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat rekap: ${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  const rawData = safeArray(result);

  if (rawData.length === 0) {
    document.getElementById('rekapContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128203;</div>
        <div class="empty-text">Tidak ada data presensi untuk periode ini</div>
      </div>
    `;
    return;
  }

  // Lakukan perhitungan ulang berdasarkan kriteria user:
  // - Total Sesi = Hadir + Izin + Sakit + Alfa
  // - Total Hadir = Hadir + Izin + Sakit
  // - Persentase = (Total Hadir / Total Sesi) * 100%
  currentRekapData = rawData.map(r => {
    const hadir = Number(r.hadir || 0);
    const izin = Number(r.izin || 0);
    const sakit = Number(r.sakit || 0);
    const alfa = Number(r.alfa || 0);

    const totalSesi = hadir + izin + sakit + alfa;
    const totalHadir = hadir + izin + sakit;
    const persentase = totalSesi > 0 ? Math.round((totalHadir / totalSesi) * 100) : 0;

    return {
      nama: r.nama,
      kelas: r.kelas,
      hadir,
      izin,
      sakit,
      alfa,
      totalSesi,
      totalHadir,
      persentase
    };
  });

  // Tampilkan tombol export
  document.getElementById('btnExport').classList.remove('hidden');

  // Hitung total statistik ringkasan
  let totalHadir = 0, totalIzin = 0, totalSakit = 0, totalAlfa = 0;
  currentRekapData.forEach(r => {
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

  // Render tabel menggunakan DOM API
  const card = document.createElement('div');
  card.className = 'card';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'card-title';
  titleDiv.innerHTML = `<span class="icon">&#128203;</span> Detail Rekap <span class="count-badge">${currentRekapData.length} santri</span>`;

  const dateInfo = document.createElement('div');
  dateInfo.className = 'date-info mb-2';
  dateInfo.textContent = `${formatDisplayDate(tglMulai)} s/d ${formatDisplayDate(tglAkhir)}`;

  const tableContainer = document.createElement('div');
  tableContainer.className = 'rekap-table-container';

  const table = document.createElement('table');
  table.className = 'rekap-table';

  // Table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Nama', 'Kelas', 'Total Sesi', 'Hadir', 'Izin', 'Sakit', 'Alfa', 'Total Hadir', '%'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  currentRekapData.forEach(r => {
    const row = document.createElement('tr');
    const pctClass = r.persentase >= 80 ? 'high' : (r.persentase >= 60 ? 'medium' : 'low');

    // Nama
    const tdNama = document.createElement('td');
    tdNama.textContent = r.nama || '';
    row.appendChild(tdNama);

    // Kelas
    const tdKelas = document.createElement('td');
    tdKelas.textContent = r.kelas || '';
    row.appendChild(tdKelas);

    // Total Sesi
    const tdAktif = document.createElement('td');
    tdAktif.textContent = r.totalSesi;
    row.appendChild(tdAktif);

    // Hadir, Izin, Sakit, Alfa
    [
      { val: r.hadir, cls: 'badge-hadir' },
      { val: r.izin, cls: 'badge-izin' },
      { val: r.sakit, cls: 'badge-sakit' },
      { val: r.alfa, cls: 'badge-alfa' }
    ].forEach(item => {
      const td = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${item.cls}`;
      badge.textContent = item.val;
      td.appendChild(badge);
      row.appendChild(td);
    });

    // Total Hadir
    const tdTotal = document.createElement('td');
    tdTotal.innerHTML = `<strong>${r.totalHadir}</strong>`;
    row.appendChild(tdTotal);

    // Persentase
    const tdPct = document.createElement('td');
    const strong = document.createElement('strong');
    strong.textContent = `${r.persentase}%`;
    tdPct.appendChild(strong);

    const bar = document.createElement('div');
    bar.className = 'percentage-bar';
    const fill = document.createElement('div');
    fill.className = `percentage-fill ${pctClass}`;
    fill.style.width = `${Math.min(Math.max(r.persentase, 0), 100)}%`;
    bar.appendChild(fill);
    tdPct.appendChild(bar);

    row.appendChild(tdPct);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  tableContainer.appendChild(table);
  card.appendChild(titleDiv);
  card.appendChild(dateInfo);
  card.appendChild(tableContainer);

  document.getElementById('rekapContent').innerHTML = '';
  document.getElementById('rekapContent').appendChild(card);
}

/**
 * Ekspor data ke format Excel (.xlsx) menggunakan SheetJS
 */
function exportToExcel() {
  if (currentRekapData.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'error');
    return;
  }

  const tglMulai = document.getElementById('tglMulai').value;
  const tglAkhir = document.getElementById('tglAkhir').value;
  const wb = XLSX.utils.book_new();

  // Helper function untuk format row
  const formatRows = (dataArr) => {
    return dataArr.map((r, index) => {
      return {
        'No': index + 1,
        'Nama Santri': r.nama,
        'Kelas': r.kelas,
        'Total Sesi': r.totalSesi,
        'Hadir': r.hadir,
        'Izin': r.izin,
        'Sakit': r.sakit,
        'Alfa': r.alfa,
        'Total Hadir': r.totalHadir,
        'Persentase Kehadiran (%)': r.persentase
      };
    });
  };

  // Helper function untuk styling kolom
  const wscols = [
    { wch: 5 },  // No
    { wch: 30 }, // Nama
    { wch: 10 }, // Kelas
    { wch: 15 }, // Total Sesi
    { wch: 8 },  // Hadir
    { wch: 8 },  // Izin
    { wch: 8 },  // Sakit
    { wch: 8 },  // Alfa
    { wch: 15 }, // Total Hadir
    { wch: 22 }  // Persentase
  ];

  if (rekapKelas === 'semua') {
    // Jika semua kelas, pisahkan ke dalam multi-sheet berdasarkan CONFIG.KELAS
    CONFIG.KELAS.forEach(k => {
      const dataKelas = currentRekapData.filter(r => r.kelas === k);
      if (dataKelas.length > 0) {
        const ws = XLSX.utils.json_to_sheet(formatRows(dataKelas));
        ws['!cols'] = wscols;
        XLSX.utils.book_append_sheet(wb, ws, `Kelas ${k}`);
      }
    });
    
    // Tambah sheet untuk data yang kelasnya tidak ada di CONFIG (jika ada)
    const dataLain = currentRekapData.filter(r => !CONFIG.KELAS.includes(r.kelas));
    if (dataLain.length > 0) {
      const ws = XLSX.utils.json_to_sheet(formatRows(dataLain));
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, 'Lainnya');
    }

  } else {
    // Jika hanya satu kelas, buat satu sheet saja
    const ws = XLSX.utils.json_to_sheet(formatRows(currentRekapData));
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, `Kelas ${rekapKelas}`);
  }

  // Nama file: Rekap_Presensi_YYYYMMDD_to_YYYYMMDD.xlsx
  const filename = `Rekap_Presensi_${tglMulai.replace(/-/g, '')}_ke_${tglAkhir.replace(/-/g, '')}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
  showToast('Rekap Excel berhasil diunduh!', 'success');
}

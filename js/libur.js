// ============================================================
// Libur - Logic Kelola Hari Libur
// ============================================================

let deleteLiburTarget = { tanggal: '', sesi: '' };

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  if (!Auth.isAdmin()) {
    // Redirect ke dashboard karena ustaz tidak boleh kelola hari libur
    window.location.href = 'dashboard.html';
    return;
  }
  initLibur();
});

function initLibur() {
  // Setup click listener for back button
  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // Set default tanggal ke hari ini
  document.getElementById('liburTanggal').value = formatDate(new Date());

  // Setup click listeners
  const btnCancelDeleteLibur = document.getElementById('btnCancelDeleteLibur');
  if (btnCancelDeleteLibur) {
    btnCancelDeleteLibur.addEventListener('click', closeDeleteModal);
  }

  const btnDelete = document.getElementById('btnDelete');
  if (btnDelete) {
    btnDelete.addEventListener('click', confirmDelete);
  }

  // Setup form
  document.getElementById('liburForm').addEventListener('submit', handleAddLibur);

  loadLibur();
}

async function loadLibur() {
  document.getElementById('liburLoading').classList.remove('hidden');
  document.getElementById('liburList').innerHTML = '';

  const result = await API.getLibur();

  document.getElementById('liburLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('liburList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data: ${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  const data = safeArray(result);

  if (data.length === 0) {
    document.getElementById('liburList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128197;</div>
        <div class="empty-text">Belum ada hari libur khusus yang ditambahkan</div>
      </div>
    `;
    return;
  }

  const listEl = document.getElementById('liburList');
  listEl.innerHTML = '';

  data.forEach(l => {
    const displayDate = formatDisplayDate(l.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const sesiText = l.sesi === 'Semua' ? 'Pagi & Malam' : 'Sesi ' + l.sesi;

    const item = document.createElement('div');
    item.className = 'libur-item';

    const info = document.createElement('div');
    info.className = 'libur-info';

    const dateEl = document.createElement('div');
    dateEl.className = 'libur-date';
    dateEl.textContent = displayDate;

    const sesiEl = document.createElement('div');
    sesiEl.className = 'libur-sesi';
    sesiEl.textContent = sesiText;

    const descEl = document.createElement('div');
    descEl.className = 'libur-desc';
    descEl.textContent = l.keterangan;

    info.appendChild(dateEl);
    info.appendChild(sesiEl);
    info.appendChild(descEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon delete';
    deleteBtn.innerHTML = '&#128465;';
    deleteBtn.title = 'Hapus';
    deleteBtn.addEventListener('click', () => showDeleteModal(l.tanggal, l.sesi, l.keterangan));

    item.appendChild(info);
    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });
}

async function handleAddLibur(e) {
  e.preventDefault();

  const tanggal = document.getElementById('liburTanggal').value;
  const sesi = document.getElementById('liburSesi').value;
  const keterangan = document.getElementById('liburKeterangan').value.trim();
  const btn = document.getElementById('btnAddLibur');

  if (!tanggal || !keterangan) {
    showToast('Lengkapi semua field', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const result = await API.addLibur(tanggal, sesi, keterangan);

  btn.disabled = false;
  btn.textContent = 'Tambah Hari Libur';

  if (result.success) {
    showToast(result.message, 'success');
    document.getElementById('liburKeterangan').value = '';
    loadLibur();
  } else {
    showToast(result.message || 'Gagal menambahkan hari libur', 'error');
  }
}

function showDeleteModal(tanggal, sesi, keterangan) {
  deleteLiburTarget = { tanggal, sesi };
  const displayDate = formatDisplayDate(tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('deleteInfo').textContent = `${displayDate} - ${keterangan}`;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
  const btn = document.getElementById('btnDelete');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  const result = await API.deleteLibur(deleteLiburTarget.tanggal, deleteLiburTarget.sesi);

  btn.disabled = false;
  btn.textContent = 'Hapus';

  if (result.success) {
    showToast(result.message, 'success');
    closeDeleteModal();
    loadLibur();
  } else {
    showToast(result.message || 'Gagal menghapus', 'error');
  }
}

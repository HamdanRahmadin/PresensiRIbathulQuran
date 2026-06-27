// ============================================================
// Kelas - Logic Kelola Kelas (Admin Only)
// ============================================================

let deleteKelasTarget = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  if (!Auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }
  initKelas();
});

function initKelas() {
  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  const btnCancelDelete = document.getElementById('btnCancelDeleteKelas');
  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', closeDeleteModal);
  }

  const btnConfirmDelete = document.getElementById('btnConfirmDeleteKelas');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', confirmDeleteKelas);
  }

  document.getElementById('kelasForm').addEventListener('submit', handleAddKelas);

  loadKelas();
}

async function loadKelas() {
  document.getElementById('kelasLoading').classList.remove('hidden');
  document.getElementById('kelasList').innerHTML = '';

  const result = await API.getKelas();

  document.getElementById('kelasLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('kelasList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data kelas: ${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  const data = safeArray(result);
  
  // Update CONFIG.KELAS secara lokal (session) agar konsisten sebelum refresh
  CONFIG.KELAS = data;

  if (data.length === 0) {
    document.getElementById('kelasList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#127979;</div>
        <div class="empty-text">Belum ada kelas yang terdaftar</div>
      </div>
    `;
    return;
  }

  const listEl = document.getElementById('kelasList');
  listEl.innerHTML = '';

  data.forEach(k => {
    const item = document.createElement('div');
    item.className = 'presensi-item'; // Pinjam style presensi-item

    const info = document.createElement('div');
    info.className = 'santri-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'santri-name';
    nameEl.textContent = 'Kelas ' + k;
    info.appendChild(nameEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon delete';
    deleteBtn.innerHTML = '&#128465;';
    deleteBtn.title = 'Hapus Kelas';
    deleteBtn.addEventListener('click', () => showDeleteModal(k));

    item.appendChild(info);
    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });
}

async function handleAddKelas(e) {
  e.preventDefault();

  const namaKelas = document.getElementById('inputNamaKelas').value.trim();
  const btn = document.getElementById('btnAddKelas');

  if (!namaKelas) {
    showToast('Nama kelas tidak boleh kosong', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const result = await API.addKelas(namaKelas);

  btn.disabled = false;
  btn.textContent = 'Simpan Kelas';

  if (result.success) {
    showToast(result.message, 'success');
    document.getElementById('inputNamaKelas').value = '';
    loadKelas();
  } else {
    showToast(result.message || 'Gagal menambah kelas', 'error');
  }
}

function showDeleteModal(namaKelas) {
  deleteKelasTarget = namaKelas;
  document.getElementById('deleteKelasName').textContent = namaKelas;
  document.getElementById('deleteKelasModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteKelasModal').classList.add('hidden');
}

async function confirmDeleteKelas() {
  const btn = document.getElementById('btnConfirmDeleteKelas');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  const result = await API.deleteKelas(deleteKelasTarget);

  btn.disabled = false;
  btn.textContent = 'Hapus';

  if (result.success) {
    showToast(result.message, 'success');
    closeDeleteModal();
    loadKelas();
  } else {
    showToast(result.message || 'Gagal menghapus kelas', 'error');
  }
}

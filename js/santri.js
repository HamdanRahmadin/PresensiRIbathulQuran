// ============================================================
// Santri - Logic CRUD Data Santri
// ============================================================

let currentFilter = 'semua';
let editMode = false;
let editNamaLama = '';
let editKelasLama = '';
let deleteTarget = { nama: '', kelas: '' };

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  initSantri();
});

function initSantri() {
  // Setup filter tabs
  document.querySelectorAll('.filter-tabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.kelas;
      loadSantri();
    });
  });

  // Setup form
  document.getElementById('santriForm').addEventListener('submit', handleSubmit);

  loadSantri();
}

async function loadSantri() {
  document.getElementById('santriLoading').classList.remove('hidden');
  document.getElementById('santriList').innerHTML = '';

  const result = await API.getSantri(currentFilter);

  document.getElementById('santriLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('santriList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data: ${result.message}</div>
      </div>
    `;
    return;
  }

  const data = result.data;
  document.getElementById('santriCount').textContent = `Total: ${data.length} santri`;

  if (data.length === 0) {
    document.getElementById('santriList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128100;</div>
        <div class="empty-text">Belum ada data santri${currentFilter !== 'semua' ? ' di Kelas ' + currentFilter : ''}</div>
      </div>
    `;
    return;
  }

  let html = '';
  data.forEach(s => {
    html += `
      <div class="santri-item">
        <div class="santri-info">
          <div class="santri-name">${s.nama}</div>
          <div class="santri-class">Kelas ${s.kelas}</div>
        </div>
        <div class="santri-actions">
          <button class="btn-icon edit" onclick="showEditModal('${escapeQuote(s.nama)}', '${s.kelas}')" title="Edit">&#9998;</button>
          <button class="btn-icon delete" onclick="showDeleteModal('${escapeQuote(s.nama)}', '${s.kelas}')" title="Hapus">&#128465;</button>
        </div>
      </div>
    `;
  });

  document.getElementById('santriList').innerHTML = html;
}

function escapeQuote(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ---- Modal Tambah ----
function showAddModal() {
  editMode = false;
  document.getElementById('modalTitle').textContent = 'Tambah Santri';
  document.getElementById('inputNama').value = '';
  document.getElementById('inputKelas').value = 'A';
  document.getElementById('btnSubmit').textContent = 'Simpan';
  document.getElementById('santriModal').classList.remove('hidden');
}

// ---- Modal Edit ----
function showEditModal(nama, kelas) {
  editMode = true;
  editNamaLama = nama;
  editKelasLama = kelas;
  document.getElementById('modalTitle').textContent = 'Edit Santri';
  document.getElementById('inputNama').value = nama;
  document.getElementById('inputKelas').value = kelas;
  document.getElementById('btnSubmit').textContent = 'Perbarui';
  document.getElementById('santriModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('santriModal').classList.add('hidden');
}

// ---- Submit Form ----
async function handleSubmit(e) {
  e.preventDefault();

  const nama = document.getElementById('inputNama').value.trim();
  const kelas = document.getElementById('inputKelas').value;
  const btn = document.getElementById('btnSubmit');

  if (!nama) {
    showToast('Nama santri tidak boleh kosong', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  let result;
  if (editMode) {
    result = await API.editSantri(editNamaLama, editKelasLama, nama, kelas);
  } else {
    result = await API.addSantri(nama, kelas);
  }

  btn.disabled = false;
  btn.textContent = editMode ? 'Perbarui' : 'Simpan';

  if (result.success) {
    showToast(result.message, 'success');
    closeModal();
    loadSantri();
  } else {
    showToast(result.message || 'Gagal menyimpan data', 'error');
  }
}

// ---- Modal Hapus ----
function showDeleteModal(nama, kelas) {
  deleteTarget = { nama, kelas };
  document.getElementById('deleteNama').textContent = `${nama} (Kelas ${kelas})`;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
  const btn = document.getElementById('btnDelete');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  const result = await API.deleteSantri(deleteTarget.nama, deleteTarget.kelas);

  btn.disabled = false;
  btn.textContent = 'Hapus';

  if (result.success) {
    showToast(result.message, 'success');
    closeDeleteModal();
    loadSantri();
  } else {
    showToast(result.message || 'Gagal menghapus data', 'error');
  }
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

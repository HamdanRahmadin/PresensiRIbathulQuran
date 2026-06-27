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
  if (!Auth.isAdmin()) {
    // Redirect ke dashboard karena ustaz tidak boleh kelola data santri
    window.location.href = 'dashboard.html';
    return;
  }
  initSantri();
});

function initSantri() {
  // Setup click listener for back button
  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // Setup filter tabs
  document.querySelectorAll('.filter-tabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.kelas;
      loadSantri();
    });
  });

  // Setup click listeners
  const btnAddSantri = document.getElementById('btnAddSantri');
  if (btnAddSantri) btnAddSantri.addEventListener('click', showAddModal);

  const btnCancelAdd = document.getElementById('btnCancelAdd');
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeModal);

  const btnCancelDelete = document.getElementById('btnCancelDelete');
  if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);

  const btnDelete = document.getElementById('btnDelete');
  if (btnDelete) btnDelete.addEventListener('click', confirmDelete);

  // Setup form
  document.getElementById('santriForm').addEventListener('submit', handleSubmit);

  loadSantri();
}

async function loadSantri() {
  document.getElementById('santriLoading').classList.remove('hidden');
  document.getElementById('santriList').innerHTML = '';

  const kelas = currentFilter === 'semua' ? '' : currentFilter;
  const result = await API.getSantri(kelas);

  document.getElementById('santriLoading').classList.add('hidden');

  if (!result.success) {
    document.getElementById('santriList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <div class="empty-text">Gagal memuat data: ${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  const data = safeArray(result);
  document.getElementById('santriCount').textContent = `Total: ${data.length} santri`;

  if (data.length === 0) {
    document.getElementById('santriList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128100;</div>
        <div class="empty-text">Belum ada data santri${currentFilter !== 'semua' ? ' di Kelas ' + escapeHtml(currentFilter) : ''}</div>
      </div>
    `;
    return;
  }

  const listEl = document.getElementById('santriList');
  listEl.innerHTML = '';

  data.forEach(s => {
    const item = document.createElement('div');
    item.className = 'santri-item';

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

    const actions = document.createElement('div');
    actions.className = 'santri-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon edit';
    editBtn.innerHTML = '&#9998;';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => showEditModal(s.nama, s.kelas));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon delete';
    deleteBtn.innerHTML = '&#128465;';
    deleteBtn.title = 'Hapus';
    deleteBtn.addEventListener('click', () => showDeleteModal(s.nama, s.kelas));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
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
